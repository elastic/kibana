define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  // Data
  var series = require('vislib_fixtures/mock_data/terms/_series');
  var columns = require('vislib_fixtures/mock_data/terms/_columns');
  var rows = require('vislib_fixtures/mock_data/terms/_rows');
  //var termSeries = require('vislib_fixtures/mock_data/terms/_series');
  //var termColumns = require('vislib_fixtures/mock_data/terms/_columns');

  var dataArray = [
    series,
    columns,
    rows
    //termSeries,
    //termColumns
  ];

  var names = [
    'series',
    'columns',
    'rows'
    //'stackedSeries',
    //'term series',
    //'term columns'
  ];

  var visLibParams = {
    type: 'heatmap',
    addLegend: true,
    addTooltip: true
  };

  angular.module('HeatMapFactory', ['kibana']);

  dataArray.forEach(function (data, i) {
    describe('VisLib Heatmap Test Suite for ' + names[i] + ' Data', function () {
      var vis;

      beforeEach(function () {
        module('HeatMapFactory');
      });

      beforeEach(function () {
        inject(function (Private) {
          vis = Private(require('vislib_fixtures/_vis_fixture'))(visLibParams);
          require('css!components/vislib/styles/main');
          console.log('data', data);
          vis.render(data);
        });
      });

      //afterEach(function () {
        //$(vis.el).remove();
        //vis = null;
      //});

      describe('checkTest method', function () {
        //var errorVis;
        var goodVis;
        //var notEnoughData;
        var enoughData;

        beforeEach(function () {
          inject(function (d3, Private) {
            //errorVis = Private(require('vislib_fixtures/_vis_fixture'))(visLibParams);
            goodVis = Private(require('vislib_fixtures/_vis_fixture'))(visLibParams);
            enoughData = require('vislib_fixtures/mock_data/date_histogram/_series');
            //notEnoughData = require('vislib_fixtures/mock_data/not_enough_data/_one_point');
            require('css!components/vislib/styles/main');

            //errorVis.render(notEnoughData);
            goodVis.render(enoughData);
          });
        });

        afterEach(function () {
          //$(errorVis.el).remove();
          //$(goodVis.el).remove();
          //errorVis = null;
          //goodVis = null;
        });

        it('should not throw a Not Enough Data Error', function () {
          goodVis.handler.charts.forEach(function (chart) {
            expect(function () {
              chart.checkTest();
            }).to.throwError();
          });
        });
      });

    });
  });
});
