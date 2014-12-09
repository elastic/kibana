define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  // Data
  var series = require('vislib_fixtures/mock_data/date_histogram/_series');
  var columns = require('vislib_fixtures/mock_data/date_histogram/_columns');
  var rows = require('vislib_fixtures/mock_data/date_histogram/_rows');
  var termSeries = require('vislib_fixtures/mock_data/terms/_series');
  var termColumns = require('vislib_fixtures/mock_data/terms/_columns');

  var dataArray = [
    series,
    columns,
    rows,
    termSeries,
    termColumns
  ];

  var names = [
    'series',
    'columns',
    'rows',
    'term series',
    'term columns'
  ];

  var visLibParams = {
    type: 'heatmap',
    addLegend: true,
    addTooltip: true
  };

  angular.module('HeatmapFactory', ['kibana']);

  dataArray.forEach(function (data, i) {
    describe('VisLib Heatmap Test Suite for ' + names[i] + ' Data', function () {
      var vis;

      beforeEach(function () {
        module('HeatmapFactory');
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


      describe('addRowLabels Method', function () {
        var minGridLabelHeight = 9;
        var padding = 3;

        it('should return proper response', function () {
          vis.handler.charts.forEach(function (chart) {
            var margin = chart._attr.margin;
            var elHeight = $(chart.chartEl).height();
            var height = elHeight - margin.top - margin.bottom;
            var heightN = chart.chartData.series.length;
            var gridHeight = height / heightN;
            var maxTextLength = chart.maxRowTextLength;

            if (gridHeight < minGridLabelHeight) {
              expect($('.heat-axis-label').length).to.be(0);
            } else if (gridHeight >= minGridLabelHeight && (maxTextLength + padding) <= margin.left) {
              expect($('.heat-axis-label').length).to.be.greaterThan(0);
            }
          });
        });
      });

      describe('addColLabels Method', function () {
        var minGridLabelWidth = 9;
        var padding = 3;

        it('should return proper response', function () {
          vis.handler.charts.forEach(function (chart) {
            var margin = chart._attr.margin;
            var elWidth = $(chart.chartEl).width();
            var width = elWidth - margin.left - margin.right;
            var widthN = chart.chartData.series[0].values.length;
            var gridWidth = width / widthN;
            var maxTextLength = chart.maxColTextLength;

            if (gridWidth >= minGridLabelWidth && (maxTextLength + padding) <= gridWidth) {
              expect($('.heat-axis-label').length).to.be.greaterThan(0);
            }
          });
        });
      });

      describe('maxTextLength Method', function () {
        var selection;

        beforeEach(function () {
          inject(function (d3) {
            selection = d3.selectAll('.heat-axis-label');
          });
        });

        it('should return a number', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(_.isNumber(chart.maxTextLength(selection))).to.be(true);
          });
        });
      });

      describe('dataColor Method', function () {
        var zero = {x: '', row: '', y: 0};
        var val = {x: '', row: '', y: 120};
        var hexColor;
        var isHexColor;

        it('should return a hex color', function () {
          vis.handler.charts.forEach(function (chart) {
            hexColor = chart.dataColor(val);
            isHexColor = /^#[0-9A-F]{6}$/i.test(hexColor);

            expect(chart.dataColor(zero)).to.be('#ededed');
            expect(isHexColor).to.be(true);
          });
        });
      });

      describe('addRects Method', function () {
        it('should return rects', function () {
          vis.handler.charts.forEach(function (chart) {
            expect($(chart.chartEl).find('rect').length).to.be.greaterThan(0);
          });
        });
      });

    });
  });
});
