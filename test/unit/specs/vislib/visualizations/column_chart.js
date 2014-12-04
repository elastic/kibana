define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  // Data
  var series = require('vislib_fixtures/mock_data/date_histogram/_series');
  var termsColumns = require('vislib_fixtures/mock_data/terms/_columns');
  var significantTermsRows = require('vislib_fixtures/mock_data/significant_terms/_rows');
  var stackedSeries = require('vislib_fixtures/mock_data/date_histogram/_stacked_series');
  var dataArray = [
    series,
    termsColumns,
    significantTermsRows,
    stackedSeries
  ];
  var names = [
    'series',
    'terms columns',
    'significant terms rows',
    'stackedSeries'
  ];
  var modes = [
    'stacked',
    'grouped',
    'percentage',
    'stacked'
  ];

  angular.module('ColumnChartFactory', ['kibana']);

  dataArray.forEach(function (data, i) {
    describe('VisLib Column Chart Test Suite for ' + names[i] + ' Data', function () {
      var vis;
      var visLibParams = {
        type: 'histogram',
        addLegend: true,
        addTooltip: true,
        mode: modes[i]
      };

      beforeEach(function () {
        module('AreaChartFactory');
      });

      beforeEach(function () {
        inject(function (Private) {
          vis = Private(require('vislib_fixtures/_vis_fixture'))(visLibParams);
          require('css!components/vislib/styles/main');

          vis.on('brush', function (e) {
            console.log(e);
          });

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

      describe('addBars method', function () {
        it('should append rects', function () {
          var numOfSeries;
          var numOfValues;
          var product;

          vis.handler.charts.forEach(function (chart) {
            numOfSeries = chart.chartData.series.length;
            numOfValues = chart.chartData.series[0].values.length;
            product = numOfSeries * numOfValues;

            // Need to substract 4 rects from total since adding brushing
            expect($(chart.chartEl).find('rect').length - 4).to.be(product);
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

      describe('addStackedBars method', function () {});

      describe('addGroupedBars method', function () {});

      describe('addBarEvents method', function () {
        var rect;
        var d3selectedRect;
        var brush;
        var onClick;
        var onMouseOver;
        var onBrush;

        beforeEach(function () {
          inject(function (d3) {
            vis.handler.charts.forEach(function (chart) {
              rect = $(chart.chartEl).find('rect')[4];
              d3selectedRect = d3.select(rect)[0][0];
              brush = d3.select('.brush')[0][0];

              // d3 instance of click and hover
              onBrush = (!!brush);
              onClick = (!!d3selectedRect.__onclick);
              onMouseOver = (!!d3selectedRect.__onmouseover);
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
