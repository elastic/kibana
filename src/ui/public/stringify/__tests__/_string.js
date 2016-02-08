import expect from 'expect.js';
import ngMock from 'ngMock';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
describe('String Format', function () {
  var fieldFormats;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fieldFormats = Private(RegistryFieldFormatsProvider);
  }));

  it('decode a base64 string', function () {
    var StringFormat = fieldFormats.getType('string');
    var string = new StringFormat({
      transform: 'base64'
    });
    expect(string.convert('Zm9vYmFy')).to.be('foobar');
  });

});
