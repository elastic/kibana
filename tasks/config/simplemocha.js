module.exports = {
  options: {
    timeout: 10000,
    slow: 5000,
    ignoreLeaks: false,
    reporter: require('../../src/dev/mocha/auto_junit_reporter'),
    reporterOptions: {
      reportName: 'Server Mocha Tests'
    },
    globals: ['nil'],
  },
  all: {
    src: [
      require.resolve('../../src/babel-register'),
      'test/**/__tests__/**/*.js',
      'src/**/__tests__/**/*.js',
      'tasks/**/__tests__/**/*.js',
      'test/fixtures/__tests__/*.js',
      '!**/__tests__/fixtures/**/*',
      '!src/**/public/**',
      '!**/_*.js'
    ]
  }
};
