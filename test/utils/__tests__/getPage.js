var expect = require('expect.js');
var getPage = require('../getPage');

describe('getPage', function () {
  it('should be able to convert a config and a path to a url', function() {
    expect(getPage({
      protocol: 'http',
      hostname: 'localhost',
      port: 9220
    }, 'foo')).to.be('http://localhost:9220/foo');

    expect(getPage({
      protocol: 'https',
      hostname: 'localhost',
    }, 'foo')).to.be('https://localhost/foo');

  });
});
