describe('Color Format', function () {
  var fieldFormats;
  var ColorFormat;
  var expect = require('expect.js');
  var ngMock = require('ngMock');

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fieldFormats = Private(require('ui/registry/field_formats'));
    ColorFormat = fieldFormats.getType('color');

  }));

  it('should add colors if the value is in range', function () {
    var colorer = new ColorFormat({
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
    var colorer = new ColorFormat({
      colors: [{
        range: '100150',
        text: 'blue',
        background: 'yellow'
      }]
    });
    expect(colorer.convert(99, 'html')).to.eql('99');
  });
});
