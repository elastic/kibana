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


  it('should take into account numerical format', function () {
    let colorer = new ColorFormat({
      colors: [{
        range: '100:150',
        text: 'blue',
        background: 'yellow'
      }]
      //,
      // pattern: '0,0.[000]'
    });
    expect(colorer.convert(99.5555, 'html')).to.eql('99.556');
    expect(colorer.convert(100.5555, 'html')).to.eql('<span style="color: blue;background-color: yellow;">100.556</span>');
    expect(colorer.convert(149.5555, 'html')).to.eql('<span style="color: blue;background-color: yellow;">149.556</span>');
    expect(colorer.convert(151.5555, 'html')).to.eql('151.556');

  });

  it('should take into account custom numerical format', function () {
    let colorer = new ColorFormat({
      colors: [{
        range: '100:150',
        text: 'blue',
        background: 'yellow'
      }],
      pattern: '0,0.[00]'
    });
    expect(colorer.convert(99.5555, 'html')).to.eql('99.56');
    expect(colorer.convert(100.5555, 'html')).to.eql('<span style="color: blue;background-color: yellow;">100.56</span>');
    expect(colorer.convert(149.5555, 'html')).to.eql('<span style="color: blue;background-color: yellow;">149.56</span>');
    expect(colorer.convert(151.5555, 'html')).to.eql('151.56');

  });




});
