module.exports = {
  options: {
    timeout: 10000,
    slow: 5000,
    ignoreLeaks: false,
    reporter: 'dot'
  },
  all: {
    src: [
      'test/**/__tests__/**/*.js',
      'src/**/__tests__/**/*.js',
      'test/fixtures/__tests__/*.js',
      '!src/**/public/**',
      '!**/_*.js',
      '!src/ui/**'
    ]
  }
};
