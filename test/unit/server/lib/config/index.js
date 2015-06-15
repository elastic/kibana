var root = require('requirefrom')('');
var config = root('src/server/lib/config');
var Config = root('src/server/lib/config/config');
var expect = require('expect.js');

describe('server.config()', function (arg) {

  it('should return a Config object', function () {
    var conf = config();
    expect(conf).to.be.an(Config);
  });

});

