var wrap = require('lodash').wrap;
var Mocha = require('mocha');

Mocha.prototype.run = wrap(Mocha.prototype.run, function (orig) {
  require('../../test/mocha_setup');
  orig.call(this);
});

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
      '!src/ui/**'
    ]
  }
};
