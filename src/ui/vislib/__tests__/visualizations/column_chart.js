
var angular = require('angular');
var expect = require('expect.js');
var ngMock = require('ngMock');
var _ = require('lodash');
var $ = require('jquery');
var d3 = require('d3');

// Data
var series = require('fixtures/vislib/mock_data/date_histogram/_series');
var seriesPosNeg = require('fixtures/vislib/mock_data/date_histogram/_series_pos_neg');
var seriesNeg = require('fixtures/vislib/mock_data/date_histogram/_series_neg');
var termsColumns = require('fixtures/vislib/mock_data/terms/_columns');
//var histogramRows = require('fixtures/vislib/mock_data/histogram/_rows');
var stackedSeries = require('fixtures/vislib/mock_data/date_histogram/_stacked_series');

// tuple, with the format [description, mode, data]
var dataTypesArray = [
  ['series', 'stacked', series],
  ['series with positive and negative values', 'stacked', seriesPosNeg],
  ['series with negative values', 'stacked', seriesNeg],
  ['terms columns', 'grouped', termsColumns],
  // ['histogram rows', 'percentage', histogramRows],
  ['stackedSeries', 'stacked', stackedSeries],
];

dataTypesArray.forEach(function (dataType, i) {
  var name = dataType[0];
  var mode = dataType[1];
  var data = dataType[2];

  describe('Vislib Column Chart Test Suite for ' + name + ' Data', function () {
    var vis;
    var visLibParams = {
      type: 'histogram',
      addLegend: true,
      addTooltip: true,
      mode: mode
    };

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      vis = Private(require('fixtures/vislib/_vis_fixture'))(visLibParams);
      vis.on('brush', _.noop);
      vis.render(data);
    }));

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

    describe('addBars method', function () {
      it('should append rects', function () {
        var numOfSeries;
        var numOfValues;
        var product;

        vis.handler.charts.forEach(function (chart) {
          numOfSeries = chart.chartData.series.length;
          numOfValues = chart.chartData.series[0].values.length;
          product = numOfSeries * numOfValues;
          expect($(chart.chartEl).find('.series rect')).to.have.length(product);
        });
      });
    });

    describe('updateBars method', function () {
      beforeEach(function () {
        vis.handler._attr.mode = 'grouped';
        vis.render(vis.data);
      });

      it('should returned grouped bars', function () {
        vis.handler.charts.forEach(function (chart) {});
      });
    });

    describe('addBarEvents method', function () {
      function checkChart(chart) {
        var rect = $(chart.chartEl).find('.series rect').get(0);

        // check for existance of stuff and things
        return {
          click: !!rect.__onclick,
          mouseOver: !!rect.__onmouseover,
          // D3 brushing requires that a g element is appended that
          // listens for mousedown events. This g element includes
          // listeners, however, I was not able to test for the listener
          // function being present. I will need to update this test
          // in the future.
          brush: !!d3.select('.brush')[0][0]
        };
      }

      it('should attach the brush if data is a set of ordered dates', function () {
        vis.handler.charts.forEach(function (chart) {
          var has = checkChart(chart);
          var ordered = vis.handler.data.get('ordered');
          var date = Boolean(ordered && ordered.date);
          expect(has.brush).to.be(date);
        });
      });

      it('should attach a click event', function () {
        vis.handler.charts.forEach(function (chart) {
          var has = checkChart(chart);
          expect(has.click).to.be(true);
        });
      });

      it('should attach a hover event', function () {
        vis.handler.charts.forEach(function (chart) {
          var has = checkChart(chart);
          expect(has.mouseOver).to.be(true);
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
        vis.render(data);
      });

      it('should return yAxis extents equal to data extents', function () {
        vis.handler.charts.forEach(function (chart) {
          var yAxis = chart.handler.yAxis;
          var min = vis.handler.data.getYMin();
          var max = vis.handler.data.getYMax();

          expect(yAxis.domain[0]).to.equal(min);
          expect(yAxis.domain[1]).to.equal(max);
        });
      });
    });
  });
});
