const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");

const mapSizeSelect = document.getElementById("mapSize");
const themeSelect = document.getElementById("themeSelect");
const generateBtn = document.getElementById("generateBtn");


// ===============================
// THEME SETTINGS
// ===============================

const themes = {
    classic: {
        waterLevel: 0.42,
        forest: 0.62,
        mountain: 0.78,
        colors: {
            deepWater: [35, 105, 170],
            water: [70, 145, 205],
            beach: [226, 205, 139],
            grass: [105, 165, 80],
            forest: [45, 115, 60],
            mountain: [105, 105, 105],
            snow: [235, 235, 235]
        }
    },

    forest: {
        waterLevel: 0.36,
        forest: 0.48,
        mountain: 0.76,
        colors: {
            deepWater: [25, 100, 145],
            water: [50, 135, 175],
            beach: [190, 180, 120],
            grass: [80, 150, 65],
            forest: [30, 105, 45],
            mountain: [80, 105, 75],
            snow: [220, 225, 210]
        }
    },

    ocean: {
        waterLevel: 0.56,
        forest: 0.66,
        mountain: 0.80,
        colors: {
            deepWater: [15, 75, 145],
            water: [30, 125, 190],
            beach: [235, 210, 135],
            grass: [85, 165, 75],
            forest: [35, 115, 60],
            mountain: [95, 105, 105],
            snow: [240, 240, 240]
        }
    },

    desert: {
        waterLevel: 0.34,
        forest: 0.85,
        mountain: 0.73,
        colors: {
            deepWater: [30, 110, 155],
            water: [60, 145, 180],
            beach: [235, 205, 125],
            grass: [175, 155, 75],
            forest: [120, 125, 45],
            mountain: [125, 95, 65],
            snow: [210, 195, 170]
        }
    },

    night: {
        waterLevel: 0.44,
        forest: 0.60,
        mountain: 0.76,
        colors: {
            deepWater: [15, 25, 65],
            water: [25, 55, 105],
            beach: [150, 135, 85],
            grass: [55, 90, 60],
            forest: [25, 65, 40],
            mountain: [75, 75, 90],
            snow: [175, 180, 190]
        }
    }
};


// ===============================
// RANDOM SEED
// ===============================

function randomSeed() {
    return Math.floor(Math.random() * 1000000);
}


// ===============================
// SEEDED RANDOM NUMBER
// ===============================

function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}


// ===============================
// SMOOTH INTERPOLATION
// ===============================

function smoothStep(t) {
    return t * t * (3 - 2 * t);
}

function interpolate(a, b, t) {
    return a + (b - a) * t;
}


// ===============================
// CREATE NOISE MAP
// ===============================

function createNoise(width, height, seed, scale) {

    const noise = [];

    for (let y = 0; y <= height; y++) {

        noise[y] = [];

        for (let x = 0; x <= width; x++) {

            const value = seededRandom(
                seed +
                x * 374761 +
                y * 668265 +
                scale * 92821
            );

            noise[y][x] = value;
        }
    }

    return noise;
}


// ===============================
// SAMPLE SMOOTH NOISE
// ===============================

function sampleNoise(noise, x, y) {

    const width = noise[0].length - 1;
    const height = noise.length - 1;

    x = Math.max(0, Math.min(width, x));
    y = Math.max(0, Math.min(height, y));

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);

    const x1 = Math.min(x0 + 1, width);
    const y1 = Math.min(y0 + 1, height);

    const tx = smoothStep(x - x0);
    const ty = smoothStep(y - y0);

    const top = interpolate(
        noise[y0][x0],
        noise[y0][x1],
        tx
    );

    const bottom = interpolate(
        noise[y1][x0],
        noise[y1][x1],
        tx
    );

    return interpolate(top, bottom, ty);
}


// ===============================
// MULTI-LAYER TERRAIN NOISE
// ===============================

function getTerrainNoise(noises, x, y, gridSize) {

    let value = 0;

    value += sampleNoise(
        noises.large,
        x / gridSize * (noises.large[0].length - 1),
        y / gridSize * (noises.large.length - 1)
    ) * 0.55;

    value += sampleNoise(
        noises.medium,
        x / gridSize * (noises.medium[0].length - 1),
        y / gridSize * (noises.medium.length - 1)
    ) * 0.30;

    value += sampleNoise(
        noises.small,
        x / gridSize * (noises.small[0].length - 1),
        y / gridSize * (noises.small.length - 1)
    ) * 0.15;

    return value;
}


// ===============================
// COLOR HELPER
// ===============================

function setPixel(data, index, color) {

    data[index] = color[0];
    data[index + 1] = color[1];
    data[index + 2] = color[2];
    data[index + 3] = 255;
}


// ===============================
// CREATE MAP
// ===============================

function generateMap() {

    const size = Number(mapSizeSelect.value);
    const themeName = themeSelect.value;
    const theme = themes[themeName];

    const seed = randomSeed();

    // Canvas resolution
    const resolution = Math.min(
        700,
        Math.max(420, size * 25)
    );

    canvas.width = resolution;
    canvas.height = resolution;

    const image = ctx.createImageData(
        resolution,
        resolution
    );

    const data = image.data;

    // Noise maps
    const noises = {

        large: createNoise(
            14,
            14,
            seed + 100,
            1
        ),

        medium: createNoise(
            30,
            30,
            seed + 200,
            2
        ),

        small: createNoise(
            60,
            60,
            seed + 300,
            3
        ),

        moisture: createNoise(
            30,
            30,
            seed + 400,
            4
        )
    };


    // ===============================
    // DRAW TERRAIN PIXEL BY PIXEL
    // ===============================

    for (let y = 0; y < resolution; y++) {

        for (let x = 0; x < resolution; x++) {

            const nx = x / resolution;
            const ny = y / resolution;

            // Distance from center
            const dx = nx - 0.5;
            const dy = ny - 0.5;

            const distance =
                Math.sqrt(dx * dx + dy * dy);

            // Main terrain noise
            let elevation = getTerrainNoise(
                noises,
                nx,
                ny,
                1
            );

            // Create continent-like land shapes
            let continentShape =
                1 - distance * 1.25;

            continentShape =
                Math.max(0, continentShape);

            elevation =
                elevation * 0.72 +
                continentShape * 0.28;


            // Moisture
            const moisture = sampleNoise(
                noises.moisture,
                nx * (noises.moisture[0].length - 1),
                ny * (noises.moisture.length - 1)
            );


            // Slight terrain variation
            elevation +=
                (moisture - 0.5) * 0.04;


            let color;


            // ===============================
            // WATER
            // ===============================

            if (elevation < theme.waterLevel - 0.12) {

                color = theme.colors.deepWater;

            }

            else if (elevation < theme.waterLevel) {

                color = theme.colors.water;

            }

            // ===============================
            // BEACH
            // ===============================

            else if (
                elevation <
                theme.waterLevel + 0.035
            ) {

                color = theme.colors.beach;

            }

            // ===============================
            // MOUNTAINS
            // ===============================

            else if (
                elevation >
                theme.mountain
            ) {

                const mountainAmount =
                    (elevation - theme.mountain) /
                    (1 - theme.mountain);

                if (mountainAmount > 0.55) {
                    color = theme.colors.snow;
                }
                else {
                    color = theme.colors.mountain;
                }

            }

            // ===============================
            // FOREST
            // ===============================

            else if (
                moisture > theme.forest
            ) {

                color = theme.colors.forest;

            }

            // ===============================
            // NORMAL LAND
            // ===============================

            else {

                color = theme.colors.grass;
            }


            // Add subtle terrain texture
            const texture =
                (seededRandom(
                    seed +
                    x * 17 +
                    y * 31
                ) - 0.5) * 8;


            color = [
                Math.max(0, Math.min(255, color[0] + texture)),
                Math.max(0, Math.min(255, color[1] + texture)),
                Math.max(0, Math.min(255, color[2] + texture))
            ];


            const index =
                (y * resolution + x) * 4;

            setPixel(
                data,
                index,
                color
            );
        }
    }


    ctx.putImageData(
        image,
        0,
        0
    );


    // Add rivers
    drawRivers(
        resolution,
        noises,
        theme,
        seed
    );
}


// ===============================
// DRAW RIVERS
// ===============================

function drawRivers(
    resolution,
    noises,
    theme,
    seed
) {

    const numberOfRivers =
        themeSelect.value === "desert"
            ? 3
            : 5;


    ctx.save();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";


    for (
        let river = 0;
        river < numberOfRivers;
        river++
    ) {

        let x =
            resolution *
            (0.2 + seededRandom(seed + river * 91) * 0.6);

        let y =
            resolution *
            (0.2 + seededRandom(seed + river * 157) * 0.6);


        ctx.beginPath();

        ctx.moveTo(x, y);


        for (
            let step = 0;
            step < 35;
            step++
        ) {

            const angle =
                seededRandom(
                    seed +
                    river * 1000 +
                    step * 73
                ) * Math.PI * 2;


            x += Math.cos(angle) * 7;
            y += Math.sin(angle) * 7;


            x = Math.max(
                0,
                Math.min(resolution, x)
            );

            y = Math.max(
                0,
                Math.min(resolution, y)
            );


            ctx.lineTo(x, y);
        }


        ctx.strokeStyle =
            theme.colors.water === undefined
                ? "rgba(60,140,210,0.7)"
                : "rgba(40,120,200,0.75)";


        ctx.lineWidth =
            Math.max(1.5, resolution / 400);


        ctx.stroke();
    }

    ctx.restore();
}


// ===============================
// CHANGE THEME
// ===============================

function updateTheme() {

    const theme =
        themeSelect.value;

    document.body.className =
        "theme-" + theme;

    generateMap();
}


// ===============================
// EVENTS
// ===============================

generateBtn.addEventListener(
    "click",
    generateMap
);

themeSelect.addEventListener(
    "change",
    updateTheme
);

mapSizeSelect.addEventListener(
    "change",
    generateMap
);


// ===============================
// INITIAL MAP
// ===============================

updateTheme();
