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
        //$(vis.el).remove();
        //vis = null;
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
