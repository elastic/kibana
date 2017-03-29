const jest = require('jest');
const config = require('./ui_framework_test_config');

const argv = process.argv.slice(2);

argv.push('--config', JSON.stringify(config));

jest.run(argv);
