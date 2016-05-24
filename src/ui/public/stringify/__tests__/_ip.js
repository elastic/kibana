import expect from 'expect.js';
import ngMock from 'ng_mock';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
describe('IP Address Format', function () {
  let ip;
  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    const fieldFormats = Private(RegistryFieldFormatsProvider);
    ip = fieldFormats.getInstance('ip');
  }));

  it('converts a value from a decimal to a string', function () {
    expect(ip.convert(1186489492)).to.be('70.184.100.148');
  });

  it('converts null and undefined to -',  function () {
    expect(ip.convert(null)).to.be('-');
    expect(ip.convert(undefined)).to.be('-');
  });

});
