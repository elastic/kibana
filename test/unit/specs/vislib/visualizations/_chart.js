define(function (require) {
  var angular = require('angular');

  angular.module('ChartBaseClass', ['kibana']);
  angular.module('ColumnChartFactory', ['kibana']);

  describe('VisLib _chart Test Suite', function () {
    var ColumnChart;
    var Chart;
    var Data;
    var Vis;
    var chartData = {};
    var vis;
    var el;
    var myChart;
    var config;
    var data = {
      hits      : 621,
      label     : '',
      ordered   : {
        date: true,
        interval: 30000,
        max     : 1408734982458,
        min     : 1408734082458
      },
      series    : [
        {
          values: [
            {
              x: 1408734060000,
              y: 8
            },
            {
              x: 1408734090000,
              y: 23
            },
            {
              x: 1408734120000,
              y: 30
            },
            {
              x: 1408734150000,
              y: 28
            },
            {
              x: 1408734180000,
              y: 36
            },
            {
              x: 1408734210000,
              y: 30
            },
            {
              x: 1408734240000,
              y: 26
            },
            {
              x: 1408734270000,
              y: 22
            },
            {
              x: 1408734300000,
              y: 29
            },
            {
              x: 1408734330000,
              y: 24
            }
          ]
        }
      ],
      tooltipFormatter: function (datapoint) {
        return datapoint;
      },
      xAxisFormatter: function (thing) {
        return thing;
      },
      xAxisLabel: 'Date Histogram',
      yAxisLabel: 'Count'
    };

    beforeEach(function () {
      module('ChartBaseClass');
      module('ColumnChartFactory');
    });

    beforeEach(function () {
      inject(function (d3, Private) {
        Vis = Private(require('components/vislib/vis'));
        Data = Private(require('components/vislib/lib/data'));
        ColumnChart = Private(require('components/vislib/visualizations/column_chart'));
        Chart = Private(require('components/vislib/visualizations/_chart'));

        el = d3.select('body').append('div').attr('class', 'column-chart');

        config = {
          type: 'histogram',
          shareYAxis: true,
          addTooltip: true,
          addLegend: true,
          stack: d3.layout.stack(),
        };

        vis = new Vis(el[0][0], config);
        vis.data = new Data(data, config);

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
