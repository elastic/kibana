define(function (require) {
  var angular = require('angular');

  angular.module('ChartBaseClass', ['kibana']);
  angular.module('ColumnChartFactory', ['kibana']);

  describe('VisLib _chart Test Suite', function () {
    var ColumnChart;
    var Chart;
    var chartData = {};
    var vis;
    var el;
    var myChart;

    beforeEach(function () {
      module('ChartBaseClass');
      module('ColumnChartFactory');
    });

    beforeEach(function () {
      inject(function (d3, Private) {
        ColumnChart = Private(require('components/vislib/visualizations/column_chart'));
        Chart = Private(require('components/vislib/visualizations/_chart'));

        el = d3.select('body').append('div').attr('class', 'column-chart');
        vis = {
          _attr: {
            stack: d3.layout.stack()
          }
        };
        myChart = new ColumnChart(vis, el, chartData);
      });
    });

    afterEach(function () {
      el.remove();
    });

    it('should be a constructor for visualization modules', function () {
      expect(myChart instanceof Chart).to.be(true);
    });

    it('should have a render method', function () {
      expect(typeof myChart.render === 'function').to.be(true);
    });

  });
});
