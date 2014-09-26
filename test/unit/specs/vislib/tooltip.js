define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  angular.module('TooltipFactory', ['kibana']);

  describe('Vislib Tooltip', function () {
    var vis;
    var data;
    var tooltips = [];

    beforeEach(function () {
      module('TooltipFactory');
    });

    beforeEach(function () {
      inject(function (d3, Private) {
        vis = Private(require('vislib_fixtures/vis_fixture'))('histogram');
        data = require('vislib_fixtures/mock_data/series/data0');
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

    describe('render Method', function () {
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

    describe('getOffsets Method', function () {});
  });

});
