require('../../../../src/setup_node_env');

const { generateOAS } = require('./generate.js');
const { writeFileSync } = require('fs');

const spec = generateOAS({ format: ".yaml" });
writeFileSync('oas.yaml', spec);
