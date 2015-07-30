module.exports = {
  options: {
    timeout: 2000,
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
