define(function (require) {
  var _ = require('lodash');

  var angular = require('angular');

  angular.module('kibana/vislib', ['kibana']);

  describe('VisLib Index Test Suite', function () {
    var chart;

    beforeEach(function () {
      module('kibana/vislib');
    });

    beforeEach(function () {
      inject(function (d3, vislib) {
        chart = vislib;
      });
    });

    it('should return an object', function () {
      expect(_.isObject(chart)).to.be(true);
    });

    it('should return a Vis function', function () {
      expect(_.isFunction(chart.Vis)).to.be(true);
    });
  });
});
