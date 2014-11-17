define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  // Data
  var data = require('vislib_fixtures/mock_data/histogram/slices');

  angular.module('PieChartFactory', ['kibana']);

  describe('Vislib PieChart Class Test Suite', function () {
    var vis;
    var visLibParams = {
      addLegend: true,
      addTooltip: true,
      type: 'pie'
    };

    beforeEach(function () {
      module('PieChartFactory');
    });

    beforeEach(function () {
      inject(function (d3, Private) {
        vis = Private(require('vislib_fixtures/vis_fixture'))(visLibParams);
        require('css!components/vislib/styles/main');
        console.log(vis);

        vis.render(data);
      });
    });

    afterEach(function () {
      $(vis.el).remove();
      vis = null;
    });

    describe('addPathEvents method', function () {});
    describe('addPath method', function () {

    });
    describe('draw method', function () {
      it('should return a function', function () {
        expect(_.isFunction(vis.ChartClass.draw())).to.be(true);
      });
    });
  });
});
