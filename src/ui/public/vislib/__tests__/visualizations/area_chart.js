var d3 = require('d3');
var angular = require('angular');
var expect = require('expect.js');
var ngMock = require('ngMock');
var _ = require('lodash');
var $ = require('jquery');

var woahLotsOfVariables = require('fixtures/vislib/mock_data/date_histogram/_series');
var notQuiteEnoughVariables = require('fixtures/vislib/mock_data/not_enough_data/_one_point');
var someOtherVariables = {
  'series pos': require('fixtures/vislib/mock_data/date_histogram/_series'),
  'series pos neg': require('fixtures/vislib/mock_data/date_histogram/_series_pos_neg'),
  'series neg': require('fixtures/vislib/mock_data/date_histogram/_series_neg'),
  'term columns': require('fixtures/vislib/mock_data/terms/_columns'),
  'range rows': require('fixtures/vislib/mock_data/range/_rows'),
  'stackedSeries': require('fixtures/vislib/mock_data/date_histogram/_stacked_series')
};

var visLibParams = {
  type: 'area',
  addLegend: true,
  addTooltip: true
};


_.forOwn(someOtherVariables, function (variablesAreCool, imaVariable) {
  describe('Vislib Area Chart Test Suite for ' + imaVariable + ' Data', function () {
    var vis;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      vis = Private(require('fixtures/vislib/_vis_fixture'))(visLibParams);
      vis.on('brush', _.noop);
      vis.render(variablesAreCool);
    }));

    afterEach(function () {
      $(vis.el).remove();
      vis = null;
    });

    describe('checkIfEnoughData method throws an error when not enough data', function () {
      beforeEach(function () {
        ngMock.inject(function () {
          vis.render(notQuiteEnoughVariables);
        });
      });

      it('should throw a Not Enough Data Error', function () {
        vis.handler.charts.forEach(function (chart) {
          expect(function () {
            chart.checkIfEnoughData();
          }).to.throwError();
        });
      });
    });

    describe('checkIfEnoughData method should not throw an error when enough data', function () {
      beforeEach(function () {
        ngMock.inject(function () {
          vis.render(woahLotsOfVariables);
        });
      });

      it('should not throw a Not Enough Data Error', function () {
        vis.handler.charts.forEach(function (chart) {
          expect(function () {
            chart.checkIfEnoughData();
          }).to.not.throwError();
        });
      });
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
      var brush;
      var d3selectedCircle;
      var onBrush;
      var onClick;
      var onMouseOver;

      beforeEach(ngMock.inject(function () {
        vis.handler.charts.forEach(function (chart) {
          circle = $(chart.chartEl).find('circle')[0];
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

      it('should not draw circles where d.y === 0', function () {
        vis.handler.charts.forEach(function (chart) {
          var series = chart.chartData.series;
          var isZero = series.some(function (d) {
            return d.y === 0;
          });
          var circles = $.makeArray($(chart.chartEl).find('circle'));
          var isNotDrawn = circles.some(function (d) {
            return d.__data__.y === 0;
          });

          if (isZero) {
            expect(isNotDrawn).to.be(false);
          }
        });
      });
    });

    describe('draw method', function () {
      it('should return a function', function () {
        vis.handler.charts.forEach(function (chart) {
          expect(_.isFunction(chart.draw())).to.be(true);
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
        vis.render(variablesAreCool);
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
