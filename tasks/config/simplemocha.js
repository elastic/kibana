module.exports = {
  options: {
    timeout: 10000,
    slow: 5000,
    ignoreLeaks: false,
    reporter: 'dot'
  },
  all: {
    src: [
      'src/**/__tests__/**/*.js',
      '!src/**/public/**',
      '!src/ui/**'
    ]
  }
};
