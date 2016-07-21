describe('String Format', function () {
  var fieldFormats;
  var expect = require('expect.js');
  var ngMock = require('ngMock');

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fieldFormats = Private(require('ui/registry/field_formats'));
  }));

  it('decode a base64 string', function () {
    var StringFormat = fieldFormats.getType('string');
    var string = new StringFormat({
      transform: 'base64'
    });
    expect(string.convert('Zm9vYmFy')).to.be('foobar');
  });

});
