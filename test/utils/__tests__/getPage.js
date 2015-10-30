var expect = require('expect.js');
var getUrl = require('../getUrl');

describe('getUrl', function () {
  it('should be able to convert a config and a path to a url', function () {
    expect(getUrl({
      protocol: 'http',
      hostname: 'localhost',
      port: 9220
    }, 'foo')).to.be('http://localhost:9220/foo');

    expect(getUrl({
      protocol: 'https',
      hostname: 'localhost',
    }, 'foo')).to.be('https://localhost/foo');

  });
});
