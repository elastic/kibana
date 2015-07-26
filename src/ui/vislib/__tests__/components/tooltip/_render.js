module.exports = function TooltipRenderingTestSuite() {
  var expect = require('expect.js');
  var ngMock = require('ngMock');

  describe('render Method', function () {
    var angular = require('angular');
    var _ = require('lodash');
    var $ = require('jquery');

    var vis;
    var data;
    var tooltips = [];

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      vis = Private(require('fixtures/vislib/_vis_fixture'))();
      data = require('fixtures/vislib/mock_data/date_histogram/_series');
      require('ui/vislib/styles/main.less');

      vis.render(data);
      vis.handler.charts.forEach(function (chart) {
        tooltips.push(chart.tooltip);
      });
    }));

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
