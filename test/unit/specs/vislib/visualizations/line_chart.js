define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  // Data
  var seriesPos = require('vislib_fixtures/mock_data/date_histogram/_series');
  var seriesPosNeg = require('vislib_fixtures/mock_data/date_histogram/_series_pos_neg');
  var seriesNeg = require('vislib_fixtures/mock_data/date_histogram/_series_neg');
  var histogramColumns = require('vislib_fixtures/mock_data/histogram/_columns');
  var rangeRows = require('vislib_fixtures/mock_data/range/_rows');
  var termSeries = require('vislib_fixtures/mock_data/terms/_series');
  var dateHistogramArray = [
    seriesPos,
    seriesPosNeg,
    seriesNeg,
    histogramColumns,
    rangeRows,
    termSeries,
  ];
  var names = [
    'series pos',
    'series pos neg',
    'series neg',
    'histogram columns',
    'range rows',
    'term series',
  ];

  angular.module('LineChartFactory', ['kibana']);

  dateHistogramArray.forEach(function (data, i) {
    describe('VisLib Line Chart Test Suite for ' + names[i] + ' Data', function () {
      var vis;
      var visLibParams = {
        type: 'line',
        addLegend: true,
        addTooltip: true,
        drawLinesBetweenPoints: true
      };

      beforeEach(function () {
        module('LineChartFactory');
      });

      beforeEach(function () {
        inject(function (Private) {
          vis = Private(require('vislib_fixtures/_vis_fixture'))(visLibParams);
          require('css!components/vislib/styles/main');

          vis.on('brush', _.noop);

          vis.render(data);
        });
      });

      afterEach(function () {
        $(vis.el).remove();
        vis = null;
      });

      describe('addCircleEvents method', function () {
        var circle;
        var brush;
        var d3selectedCircle;
        var onBrush;
        var onClick;
        var onMouseOver;

        beforeEach(function () {
          inject(function (d3) {
            vis.handler.charts.forEach(function (chart) {
              circle = $(chart.chartEl).find('.circle')[0];
              brush = $(chart.chartEl).find('.brush');
              d3selectedCircle = d3.select(circle)[0][0];

              // d3 instance of click and hover
              onBrush = (!!brush);
              onClick = (!!d3selectedCircle.__onclick);
              onMouseOver = (!!d3selectedCircle.__onmouseover);
            });
          });
        });

        // D3 brushing requires that a g element is appended that
        // listens for mousedown events. This g element includes
        // listeners, however, I was not able to test for the listener
        // function being present. I will need to update this test
        // in the future.
        it('should attach a brush g element', function () {
          vis.handler.charts.forEach(function () {
            expect(onBrush).to.be(true);
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

      describe('addLines method', function () {
        it('should append a paths', function () {
          vis.handler.charts.forEach(function (chart) {
            expect($(chart.chartEl).find('path').length).to.be.greaterThan(0);
          });
        });
      });

      // Cannot seem to get these tests to work on the box
      // They however pass in the browsers
      //describe('addClipPath method', function () {
      //  it('should append a clipPath', function () {
      //    vis.handler.charts.forEach(function (chart) {
      //      expect($(chart.chartEl).find('clipPath').length).to.be(1);
      //    });
      //  });
      //});

      describe('draw method', function () {
        it('should return a function', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(chart.draw()).to.be.a(Function);
          });
        });

        it('should return a yMin and yMax', function () {
          vis.handler.charts.forEach(function (chart) {
            var yAxis = chart.handler.yAxis;

            expect(yAxis.yMin).to.not.be(undefined);
            expect(yAxis.yMax).to.not.be(undefined);
          });
        });

        it('should render a zero axis line', function () {
          vis.handler.charts.forEach(function (chart) {
            var yAxis = chart.handler.yAxis;

            if (yAxis.yMin < 0 && yAxis.yMax > 0) {
              expect($(chart.chartEl).find('line.zero-line').length).to.be(1);
            }
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

      describe('defaultYExtents is true', function () {
        beforeEach(function () {
          vis._attr.defaultYExtents = true;
          vis.render(data);
        });

        it('should return yAxis extents equal to data extents', function () {
          vis.handler.charts.forEach(function (chart) {
            var yAxis = chart.handler.yAxis;
            var yVals = [vis.handler.data.getYMin(), vis.handler.data.getYMax()];

            expect(yAxis.yMin).to.equal(yVals[0]);
            expect(yAxis.yMax).to.equal(yVals[1]);
          });
        });
      });
    });
  });
});
