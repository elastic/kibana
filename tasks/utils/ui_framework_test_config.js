const path = require('path');
const rootDir = 'ui_framework';
const resolve = relativePath => path.resolve(__dirname, '..', '', relativePath);

module.exports = {
  rootDir,
  collectCoverageFrom: [
    'components/**/*.js',
    // Seems to be a bug with jest or micromatch, in which the above glob doesn't match subsequent
    // levels of directories, making this glob necessary.
    'components/**/**/*.js',
    '!components/index.js',
    '!components/**/*/index.js',
  ],
  coverageDirectory: '<rootDir>/jest/report',
  coverageReporters: ['html'],
  moduleFileExtensions: ['jsx', 'js', 'json'],
  moduleNameMapper: {
    '^.+\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm)$': resolve('config/jest/FileStub.js'),
    '^.+\\.css$': resolve('config/jest/CSSStub.js'),
    '^.+\\.scss$': resolve('config/jest/CSSStub.js')
  },
  testPathIgnorePatterns: ['<rootDir>/(dist|doc_site|jest)/'],
  testEnvironment: 'node',
  testRegex: '.*\.test\.(js|jsx)$',
  snapshotSerializers: ['<rootDir>/../node_modules/enzyme-to-json/serializer']
};
