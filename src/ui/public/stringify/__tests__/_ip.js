import expect from 'expect.js';
import ngMock from 'ng_mock';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
describe('IP Address Format', function () {
  let fieldFormats;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fieldFormats = Private(RegistryFieldFormatsProvider);
  }));

  it('converts a value from a decimal to a string', function () {
    var ip = fieldFormats.getInstance('ip');
    expect(ip.convert(1186489492)).to.be('70.184.100.148');
  });

});
