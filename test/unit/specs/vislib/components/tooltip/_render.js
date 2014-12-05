define(function (require) {
  return function TooltipRenderingTestSuite() {
    describe('render Method', function () {
      var angular = require('angular');
      var _ = require('lodash');
      var $ = require('jquery');

      angular.module('TooltipFactory', ['kibana']);

      var vis;
      var data;
      var tooltips = [];

      beforeEach(function () {
        module('TooltipFactory');
      });

      beforeEach(function () {
        inject(function (d3, Private) {
          vis = Private(require('vislib_fixtures/_vis_fixture'))();
          data = require('vislib_fixtures/mock_data/date_histogram/_series');
          require('css!components/vislib/styles/main');

          vis.render(data);
          vis.handler.charts.forEach(function (chart) {
            tooltips.push(chart.tooltip);
          });
        });
      });

      // Placeholder until we know better regarding garbage collection
      afterEach(function () {
        $(vis.el).remove();
        vis = null;
      });

      var isObject;
      var isFunction;

      beforeEach(function () {
        _.forEach(tooltips, function (tooltip) {
          isObject = _.isObject(tooltip);
          isFunction = _.isFunction(tooltip.render());
        });
      });

      it('should be an object', function () {
        expect(isObject).to.be(true);
      });

      it('should return a function', function () {
        expect(isFunction).to.be(true);
      });
    });
  };
});
