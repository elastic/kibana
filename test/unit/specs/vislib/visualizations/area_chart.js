define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  // Data
  var series = require('vislib_fixtures/mock_data/date_histogram/_series');
  var columns = require('vislib_fixtures/mock_data/date_histogram/_columns');
  var rows = require('vislib_fixtures/mock_data/date_histogram/_rows');
  var stackedSeries = require('vislib_fixtures/mock_data/date_histogram/_stacked_series');
  var termSeries = require('vislib_fixtures/mock_data/terms/_series');
  var termColumns = require('vislib_fixtures/mock_data/terms/_columns');
  var dataArray = [
    series,
    columns,
    rows,
    stackedSeries,
    termSeries,
    termColumns
  ];
  var names = [
    'series',
    'columns',
    'rows',
    'stackedSeries',
    'term series',
    'term columns'
  ];

  angular.module('AreaChartFactory', ['kibana']);

  dataArray.forEach(function (data, i) {
    describe('VisLib Area Chart Test Suite for ' + names[i] + ' Data', function () {
      var vis;
      var visLibParams = {
        type: 'area',
        addLegend: true,
        addTooltip: true
      };

      beforeEach(function () {
        module('AreaChartFactory');
      });

      beforeEach(function () {
        inject(function (Private) {
          vis = Private(require('vislib_fixtures/_vis_fixture'))(visLibParams);
          require('css!components/vislib/styles/main');

          vis.render(data);
        });
      });

      afterEach(function () {
        $(vis.el).remove();
        vis = null;
      });

      describe('stackData method', function () {
        var stackedData;
        var isStacked;

        beforeEach(function () {
          vis.handler.charts.forEach(function (chart) {
            stackedData = chart.stackData(chart.chartData);

            isStacked = stackedData.every(function (arr) {
              return arr.every(function (d) {
                return _.isNumber(d.y0);
              });
            });
          });
        });

        it('should append a d.y0 key to the data object', function () {
          expect(isStacked).to.be(true);
        });
      });

      describe('addPath method', function () {
        it('should append a area paths', function () {
          vis.handler.charts.forEach(function (chart) {
            expect($(chart.chartEl).find('path').length).to.be.greaterThan(0);
          });
        });
      });

      describe('addCircleEvents method', function () {
        var circle;
        var d3selectedCircle;
        var onClick;
        var onMouseOver;

        beforeEach(function () {
          inject(function (d3) {
            vis.handler.charts.forEach(function (chart) {
              circle = $(chart.chartEl).find('circle')[0];
              d3selectedCircle = d3.select(circle)[0][0];

              // d3 instance of click and hover
              onClick = (!!d3selectedCircle.__onclick);
              onMouseOver = (!!d3selectedCircle.__onmouseover);
            });
          });
        });

        it('should attach a click event', function () {
          vis.handler.charts.forEach(function () {
            expect(onClick).to.be(true);
          });
        });

        it('should attach a hover event', function () {
          vis.handler.charts.forEach(function () {
            expect(onMouseOver).to.be(true);
          });
        });
      });

      describe('addCircles method', function () {
        it('should append circles', function () {
          vis.handler.charts.forEach(function (chart) {
            expect($(chart.chartEl).find('circle').length).to.be.greaterThan(0);
          });
        });
      });

      describe('addClipPath method', function () {
        var clipPathY;

        beforeEach(function () {
          inject(function (d3) {
            vis.handler.charts.forEach(function (chart) {

              // First rect should be the clipPath
              clipPathY = parseInt(d3.select(chart.chartEl).select('rect').attr('y'), 10);
            });
          });
        });

        it('should append a clipPath', function () {
          vis.handler.charts.forEach(function (chart) {
            expect($(chart.chartEl).find('clipPath').length).to.be(1);
          });
        });

        // Having a clipPath y value of -5 means that the circles
        // at the top of the chart will not be cut off by the clipPath
        it('should have a clipPath y value of -5', function () {
          expect(clipPathY).to.be(-5);
        });
      });

      describe('draw method', function () {
        it('should return a function', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(_.isFunction(chart.draw())).to.be(true);
          });
        });
      });

      describe('containerTooSmall error', function () {
        beforeEach(function () {
          $(vis.el).height(0);
          $(vis.el).width(0);
        });

        it('should throw an error', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(function () {
              chart.render();
            }).to.throwError();
          });
        });
      });
    });
  });
});
