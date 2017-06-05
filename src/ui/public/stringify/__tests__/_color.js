import expect from 'expect.js';
import ngMock from 'ng_mock';
import { RegistryFieldFormatsProvider } from 'ui/registry/field_formats';
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
      expect(colorer.convert(99, 'html')).to.eql('<span ng-non-bindable>99</span>');
      expect(colorer.convert(100, 'html')).to.eql(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">100</span></span>'
      );
      expect(colorer.convert(150, 'html')).to.eql(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">150</span></span>'
      );
      expect(colorer.convert(151, 'html')).to.eql('<span ng-non-bindable>151</span>');
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
      expect(colorer.convert(99, 'html')).to.eql('<span ng-non-bindable>99</span>');
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
      expect(converter('B', 'html')).to.eql('<span ng-non-bindable>B</span>');
      expect(converter('AAA', 'html')).to.eql(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">AAA</span></span>'
      );
      expect(converter('AB', 'html')).to.eql(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">AB</span></span>'
      );
      expect(converter('a', 'html')).to.eql('<span ng-non-bindable>a</span>');

      expect(converter('B', 'html')).to.eql('<span ng-non-bindable>B</span>');
      expect(converter('AAA', 'html')).to.eql(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">AAA</span></span>'
      );
      expect(converter('AB', 'html')).to.eql(
        '<span ng-non-bindable><span style="color: blue;background-color: yellow;">AB</span></span>'
      );
      expect(converter('a', 'html')).to.eql('<span ng-non-bindable>a</span>');
    });
  });
});
