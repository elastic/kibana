define(function (require) {
  var angular = require('angular');
  var $ = require('jquery');

  // Data
  var series = require('vislib_fixtures/mock_data/date_histogram/_series');
  var columns = require('vislib_fixtures/mock_data/date_histogram/_columns');
  var rows = require('vislib_fixtures/mock_data/date_histogram/_rows');
  var stackedSeries = require('vislib_fixtures/mock_data/date_histogram/_stacked_series');
  var dateHistogramArray = [
    series,
    columns,
    rows,
    stackedSeries
  ];
  var names = [
    'series',
    'columns',
    'rows',
    'stackedSeries'
  ];

  angular.module('HandlerBaseClass', ['kibana']);

  dateHistogramArray.forEach(function (data, i) {
    describe('VisLib Handler Test Suite for ' + names[i] + ' Data', function () {
      var Handler;
      var vis;
      var events;

      beforeEach(function () {
        module('HandlerBaseClass');
      });

      beforeEach(function () {
        inject(function (Private) {
          Handler = Private(require('components/vislib/lib/handler/handler'));
          vis = Private(require('vislib_fixtures/_vis_fixture'))();
          require('css!components/vislib/styles/main');

          events = [
            'click',
            'brush'
          ];

          vis.render(data);
        });
      });

      afterEach(function () {
        $(vis.el).remove();
        vis = null;
      });

      describe('render Method', function () {
        it('should render charts', function () {
          expect(vis.handler.charts.length).to.be.greaterThan(0);
          vis.handler.charts.forEach(function (chart) {
            expect($(chart.chartEl).find('svg').length).to.be(1);
          });
        });
      });

      describe('enable Method', function () {
        var charts;

        beforeEach(function () {
          charts = vis.handler.charts;

          charts.forEach(function (chart) {
            events.forEach(function (event) {
              vis.handler.enable(event, chart);
            });
          });
        });

        it('should add events to chart and emit to the Events class', function () {
          charts.forEach(function (chart) {
            events.forEach(function (event) {
              expect(typeof chart.on(event)).to.be('function');
            });
          });
        });
      });

      describe('disable Method', function () {
        var charts;

        beforeEach(function () {
          charts = vis.handler.charts;

          charts.forEach(function (chart) {
            events.forEach(function (event) {
              vis.handler.disable(event, chart);
            });
          });
        });

        it('should remove events from the chart', function () {
          charts.forEach(function (chart) {
            events.forEach(function (event) {
              expect(typeof chart.on(event)).to.be('undefined');
            });
          });
        });

      });

      describe('removeAll Method', function () {
        beforeEach(function () {
          inject(function () {
            vis.handler.removeAll(vis.el);
          });
        });

        it('should remove all DOM elements from the el', function () {
          expect($(vis.el).children().length).to.be(0);
        });
      });

      describe('error Method', function () {
        beforeEach(function () {
          vis.handler.error('This is an error!');
        });

        it('should return an error classed DOM element with a text message', function () {
          expect($(vis.el).find('.error').length).to.be(1);
          expect($('.error h4').html()).to.be('This is an error!');
        });
      });

      describe('destroy Method', function () {
        beforeEach(function () {
          vis.handler.destroy();
        });

        it('should destroy all the charts in the visualization', function () {
          expect(vis.handler.charts.length).to.be(0);
        });
      });
    });
  });
});
