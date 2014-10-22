define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  angular.module('ColumnChartFactory', ['kibana']);

  describe('Vislib ColumnChart Class Test Suite', function () {
    var ColumnChart;
    var Data;
    var chart;
    var el;
    var mydata;
    var data = {
      hits: 621,
      label: '',
      ordered: {
        date: true,
        interval: 30000,
        max: 1408734982458,
        min: 1408734082458
      },
      series: [
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
      xAxisLabel: 'Date Histogram',
      yAxisLabel: 'Count'
    };

    beforeEach(function () {
      module('ColumnChartFactory');
    });

    beforeEach(function () {
      inject(function (d3, Private) {
        ColumnChart = Private(require('components/vislib/visualizations/column_chart'));
        Data = Private(require('components/vislib/lib/data'));

        el = d3.select('body').append('div')
          .attr('class', 'vis-wrapper')
          .datum(data);

        el.append('div')
          .attr('class', 'chart-title')
          .style('height', '20px');
      });
    });

    afterEach(function () {
      el.remove();
    });

  });
});
