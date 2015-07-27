describe('IP Address Format', function () {
  var fieldFormats;
  var expect = require('expect.js');
  var ngMock = require('ngMock');

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fieldFormats = Private(require('ui/registry/field_formats'));
  }));

  it('convers a value from a decimal to a string', function () {
    var ip = fieldFormats.getInstance('ip');
    expect(ip.convert(1186489492)).to.be('70.184.100.148');
  });

});
