const rootDir = 'ui_framework';

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
  testPathIgnorePatterns: ['<rootDir>/(dist|doc_site|jest)/'],
  testEnvironment: 'node',
  testRegex: '.*\.test\.(js|jsx)$',
  snapshotSerializers: ['<rootDir>/../node_modules/enzyme-to-json/serializer']
};
