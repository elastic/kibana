const path = require('path');
const env = require('../src/env');

function mockBackportDirPath() {
  env.getBackportDirPath = jest.fn(() => path.join('homefolder', '.backport'));
}

module.exports = {
  mockBackportDirPath
};
