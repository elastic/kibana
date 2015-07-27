var d3 = require('d3');
var angular = require('angular');
var expect = require('expect.js');
var ngMock = require('ngMock');
var _ = require('lodash');
var $ = require('jquery');

// Data
var seriesPos = require('fixtures/vislib/mock_data/date_histogram/_series');
var seriesPosNeg = require('fixtures/vislib/mock_data/date_histogram/_series_pos_neg');
var seriesNeg = require('fixtures/vislib/mock_data/date_histogram/_series_neg');
var histogramColumns = require('fixtures/vislib/mock_data/histogram/_columns');
var rangeRows = require('fixtures/vislib/mock_data/range/_rows');
var termSeries = require('fixtures/vislib/mock_data/terms/_series');

var dataTypes = [
  ['series pos', seriesPos],
  ['series pos neg', seriesPosNeg],
  ['series neg', seriesNeg],
  ['histogram columns', histogramColumns],
  ['range rows', rangeRows],
  ['term series', termSeries],
];

describe('Vislib Line Chart', function () {
  dataTypes.forEach(function (type, i) {
    var name = type[0];
    var data = type[1];

    describe(name + ' Data', function () {
      var vis;

      beforeEach(ngMock.module('kibana'));
      beforeEach(ngMock.inject(function (Private) {
        var visLibParams = {
          type: 'line',
          addLegend: true,
          addTooltip: true,
          drawLinesBetweenPoints: true
        };

        vis = Private(require('fixtures/vislib/_vis_fixture'))(visLibParams);
        vis.on('brush', _.noop);
        vis.render(data);
      }));

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

        beforeEach(ngMock.inject(function () {
          vis.handler.charts.forEach(function (chart) {
            circle = $(chart.chartEl).find('.circle')[0];
            brush = $(chart.chartEl).find('.brush');
            d3selectedCircle = d3.select(circle)[0][0];

            // d3 instance of click and hover
            onBrush = (!!brush);
            onClick = (!!d3selectedCircle.__onclick);
            onMouseOver = (!!d3selectedCircle.__onmouseover);
          });
        }));

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

            expect(yAxis.domain[0]).to.not.be(undefined);
            expect(yAxis.domain[1]).to.not.be(undefined);
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

            expect(yAxis.domain[0]).to.equal(yVals[0]);
            expect(yAxis.domain[1]).to.equal(yVals[1]);
          });
        });
      });
    });
  });
});
