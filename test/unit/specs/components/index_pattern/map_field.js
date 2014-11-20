define(function (require) {
  describe('mapField', function () {

    var mapField;
    beforeEach(module('kibana'));
    beforeEach(inject(function (Private, $injector) {
      mapField = Private(require('components/index_patterns/_map_field'));
    }));

    it('should be a function', function () {
      expect(mapField).to.be.a(Function);
    });

  });
});