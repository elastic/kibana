define(function (require) {
  return ['IP Address Format', function () {
    var fieldFormats;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      fieldFormats = Private(require('registry/field_formats'));
    }));

    it('convers a value from a decimal to a string', function () {
      var ip = fieldFormats.getInstance('ip');
      expect(ip.convert(1186489492)).to.be('70.184.100.148');
    });

  }];
});
