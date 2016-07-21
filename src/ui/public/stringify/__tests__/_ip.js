describe('IP Address Format', function () {
  var expect = require('expect.js');
  var ngMock = require('ngMock');

  let ip;
  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    const fieldFormats = Private(require('ui/registry/field_formats'));
    ip = fieldFormats.getInstance('ip');
  }));

  it('convers a value from a decimal to a string', function () {
    expect(ip.convert(1186489492)).to.be('70.184.100.148');
  });

  it('converts null and undefined to -',  function () {
    expect(ip.convert(null)).to.be('-');
    expect(ip.convert(undefined)).to.be('-');
  });

});
