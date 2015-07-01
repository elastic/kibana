define(function (require) {
  return ['String Format', function () {
    var fieldFormats;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      fieldFormats = Private(require('registry/field_formats'));
    }));

    it('decode a base64 string', function () {
      var StringFormat = fieldFormats.getType('string');
      var string = new StringFormat({
        transform: 'binary'
      });
      expect(string.convert('Zm9vYmFy')).to.be('foobar');
    });

  }];
});
