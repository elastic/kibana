var root = require('requirefrom')('');
var config = root('src/hapi/lib/config');
var Config = root('src/hapi/lib/config/config');
var expect = require('expect.js');
var _ = require('lodash');

describe('server.config()', function (arg) {

  it('should return a Config object', function () {
    var conf = config();
    expect(conf).to.be.an(Config);
  });

});

