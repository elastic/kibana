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

  describe('field is a number', () => {
    it('should add colors if the value is in range', function () {
      const colorer = new ColorFormat({
        fieldType: 'number',
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
      const colorer = new ColorFormat({
        fieldType: 'number',
        colors: [{
          range: '100150',
          text: 'blue',
          background: 'yellow'
        }]
      });
      expect(colorer.convert(99, 'html')).to.eql('99');
    });
  });

  describe('field is a string', () => {
    it('should add colors if the regex matches', function () {
      const colorer = new ColorFormat({
        fieldType: 'string',
        colors: [{
          regex: 'A.*',
          text: 'blue',
          background: 'yellow'
        }]
      });

      const converter = colorer.getConverterFor('html');
      expect(converter('B', 'html')).to.eql('B');
      expect(converter('AAA', 'html')).to.eql('<span style="color: blue;background-color: yellow;">AAA</span>');
      expect(converter('AB', 'html')).to.eql('<span style="color: blue;background-color: yellow;">AB</span>');
      expect(converter('a', 'html')).to.eql('a');

      expect(converter('B', 'html')).to.eql('B');
      expect(converter('AAA', 'html')).to.eql('<span style="color: blue;background-color: yellow;">AAA</span>');
      expect(converter('AB', 'html')).to.eql('<span style="color: blue;background-color: yellow;">AB</span>');
      expect(converter('a', 'html')).to.eql('a');
    });
  });
});
