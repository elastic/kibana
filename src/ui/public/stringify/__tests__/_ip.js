describe('IP Address Format', function () {
  let fieldFormats;
  let expect = require('expect.js');
  let ngMock = require('ngMock');

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fieldFormats = Private(require('ui/registry/field_formats'));
  }));

  it('convers a value from a decimal to a string', function () {
    let ip = fieldFormats.getInstance('ip');
    expect(ip.convert(1186489492)).to.be('70.184.100.148');
  });

});
