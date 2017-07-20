module.exports = {
  options: {
    timeout: 10000,
    slow: 5000,
    ignoreLeaks: false,
    reporter: 'spec',
    globals: ['nil']
  },
  all: {
    src: [
      'test/mocha_setup.js',
      'test/**/__tests__/**/*.js',
      'src/**/__tests__/**/*.js',
      'tasks/**/__tests__/**/*.js',
      'test/fixtures/__tests__/*.js',
      '!src/**/public/**',
      '!**/_*.js'
    ]
  }
};
