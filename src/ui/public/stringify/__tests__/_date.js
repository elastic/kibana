describe('Date Format', function () {
  var fieldFormats;
  var expect = require('expect.js');
  var ngMock = require('ngMock');

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    fieldFormats = Private(require('ui/registry/field_formats'));
  }));

  it('decoding an undefined or null date should return an empty string', function () {
    var DateFormat = fieldFormats.getType('date');
    var date = new DateFormat({
      pattern: 'dd-MM-yyyy'
    });
    expect(date.convert(null)).to.be('');
    expect(date.convert(undefined)).to.be('');
  });

});
