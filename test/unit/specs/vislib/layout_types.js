define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');

  angular.module('LayoutTypeFactory', ['kibana']);

  describe('Vislib Layout Types Test Suite', function () {
    var layoutType;
    var layoutFunc;

    beforeEach(function () {
      module('LayoutTypeFactory');
    });

    beforeEach(function () {
      inject(function (d3, Private) {
        layoutType = Private(require('components/vislib/lib/layout/layout_types'));
        layoutFunc = layoutType.histogram;
      });
    });

    it('should be an object', function () {
      expect(_.isObject(layoutType)).to.be(true);
    });

    it('should return a function', function () {
      expect(typeof layoutFunc).to.be('function');
    });
  });

});
