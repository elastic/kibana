import expect from 'expect.js';
import ngMock from 'ng_mock';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
describe('Color Format', function () {
  let fieldFormats;
  let ColorFormat;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fieldFormats = Private(RegistryFieldFormatsProvider);
    ColorFormat = fieldFormats.getType('color');

  }));

  it('should add colors if the value is in range', function () {
    let colorer = new ColorFormat({
      colors: [{
        range: '100:150',
        text: 'blue',
        background: 'yellow'
      }]
    });
    let converter = colorer.getConverterFor('html');
    let field = {type:'number'};
    expect(converter(99, field)).to.eql('99');
    expect(converter(100, field)).to.eql('<span style="color: blue;background-color: yellow;">100</span>');
    expect(converter(150, field)).to.eql('<span style="color: blue;background-color: yellow;">150</span>');
    expect(converter(151, field)).to.eql('151');
  });

  it('should not convert invalid ranges', function () {
    let colorer = new ColorFormat({
      colors: [{
        range: '100150',
        text: 'blue',
        background: 'yellow'
      }]
    });
    let converter = colorer.getConverterFor('html');
    let field = {type:'number'};
    expect(converter(99, field)).to.eql('99');
  });

  it('should add colors if the regex matches', function () {
    let colorer = new ColorFormat({
      colors: [{
        regex: 'A.*',
        text: 'blue',
        background: 'yellow'
      }]
    });
    let converter = colorer.getConverterFor('html');
    let field = {type:'string'};
    expect(converter('B', field)).to.eql('B');
    expect(converter('AAA', field)).to.eql('<span style="color: blue;background-color: yellow;">AAA</span>');
    expect(converter('AB', field)).to.eql('<span style="color: blue;background-color: yellow;">AB</span>');
    expect(converter('a', field)).to.eql('a');

    // field is 'string' in case the code is triggered via vizualization (data table)
    field = 'string';
    expect(converter('B', field)).to.eql('B');
    expect(converter('AAA', field)).to.eql('<span style="color: blue;background-color: yellow;">AAA</span>');
    expect(converter('AB', field)).to.eql('<span style="color: blue;background-color: yellow;">AB</span>');
    expect(converter('a', field)).to.eql('a');
  });
});
