import expect from 'expect.js';
import ngMock from 'ngMock';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
describe('String Truncate Format', function () {
  var fieldFormats;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fieldFormats = Private(RegistryFieldFormatsProvider);
  }));

  it('truncate large string', function () {
    var Truncate = fieldFormats.getType('truncate');
    var truncate = new Truncate({fieldLength: 4});

    expect(truncate.convert('This is some text')).to.be('This...');
  });

  it('does not truncate large string when field length is not a string', function () {
    var Truncate = fieldFormats.getType('truncate');
    var truncate = new Truncate({fieldLength: 'not number'});

    expect(truncate.convert('This is some text')).to.be('This is some text');
  });

  it('does not truncate large string when field length is null', function () {
    var Truncate = fieldFormats.getType('truncate');
    var truncate = new Truncate({fieldLength: null});

    expect(truncate.convert('This is some text')).to.be('This is some text');
  });

  it('does not truncate large string when field length larger than the text', function () {
    var Truncate = fieldFormats.getType('truncate');
    var truncate = new Truncate({fieldLength: 100000});

    expect(truncate.convert('This is some text')).to.be('This is some text');
  });
});
