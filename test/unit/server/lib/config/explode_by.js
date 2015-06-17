var root = require('requirefrom')('');
var explodeBy = root('src/server/lib/config/explode_by');
var expect = require('expect.js');
var _ = require('lodash');

describe('explode_by(dot, flatObject)', function () {

  it('should explode a flatten object with dots', function () {
    var flatObject = {
      'test.enable': true,
      'test.hosts': ['host-01', 'host-02']
    };
    expect(explodeBy('.', flatObject)).to.eql({
      test: {
        enable: true,
        hosts: ['host-01', 'host-02']
      }
    });
  });

  it('should explode a flatten object with slashes', function () {
    var flatObject = {
      'test/enable': true,
      'test/hosts': ['host-01', 'host-02']
    };
    expect(explodeBy('/', flatObject)).to.eql({
      test: {
        enable: true,
        hosts: ['host-01', 'host-02']
      }
    });
  });

});
