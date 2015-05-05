var root = require('requirefrom')('');
var flattenWith = root('src/hapi/lib/config/flatten_with');
var expect = require('expect.js');
var _ = require('lodash');

describe('flatten_with(dot, nestedObj)', function () {

  it('should flatten object with dot', function () {
    var nestedObj = {
      test: {
        enable: true,
        hosts: ['host-01', 'host-02'],
        client: {
          type: 'nosql',
          pool: [{ port: 5051 }, { port: 5052 }]
        }
      }
    };
    expect(flattenWith('.', nestedObj)).to.eql({
      'test.enable': true,
      'test.hosts': ['host-01', 'host-02'],
      'test.client.type': 'nosql',
      'test.client.pool': [{ port: 5051 }, { port: 5052 }]
    });
  });

});


