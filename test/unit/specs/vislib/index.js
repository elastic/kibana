define(function (require) {
  var _ = require('lodash');

  var angular = require('angular');

  angular.module('kibana/vislib', ['kibana']);

  describe('VisLib Index Test Suite', function () {
    var visLib;

    beforeEach(function () {
      module('kibana/vislib');
    });

    beforeEach(function () {
      inject(function (d3, vislib) {
        visLib = vislib;
      });
    });

    it('should return an object', function () {
      expect(_.isObject(visLib)).to.be(true);
    });

    it('should return a Vis function', function () {
      expect(_.isFunction(visLib.Vis)).to.be(true);
    });
  });
});
