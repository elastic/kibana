define(function (require) {
  return ['Date format', function () {
    var fieldFormats;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      fieldFormats = Private(require('registry/field_formats'));
    }));

    it('decoding an undefined or null date should return an empty string', function () {
      var DateFormat = fieldFormats.getType('date');
      var date = new DateFormat({
        pattern: 'dd-MM-yyyy'
      });
      expect(date.convert(null)).to.be('-');
      expect(date.convert(undefined)).to.be('-');
    });

  }];
});
