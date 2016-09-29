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
    expect(colorer.convert(99, 'html')).to.eql('99');
    expect(colorer.convert(100, 'html')).to.eql('<span style="color: blue;background-color: yellow;">100</span>');
    expect(colorer.convert(150, 'html')).to.eql('<span style="color: blue;background-color: yellow;">150</span>');
    expect(colorer.convert(151, 'html')).to.eql('151');
  });

  it('should not convert invalid ranges', function () {
    let colorer = new ColorFormat({
      colors: [{
        range: '100150',
        text: 'blue',
        background: 'yellow'
      }]
    });
    expect(colorer.convert(99, 'html')).to.eql('99');
  });

  it('should add colors if the regex matches', function () {
    let colorer = new ColorFormat({
      colors: [{
        regex: 'A.*',
        text: 'blue',
        background: 'yellow'
      }]
    });
    expect(colorer.convert('B', 'html')).to.eql('B');
    expect(colorer.convert('AAA', 'html')).to.eql('<span style="color: blue;background-color: yellow;">B</span>');
    expect(colorer.convert('AB', 'html')).to.eql('<span style="color: blue;background-color: yellow;">AB</span>');
    expect(colorer.convert('a', 'html')).to.eql('a');
  });
});
