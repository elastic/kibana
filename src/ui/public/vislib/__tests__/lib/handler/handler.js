
var angular = require('angular');
var $ = require('jquery');
var ngMock = require('ngMock');
var expect = require('expect.js');

// Data
var series = require('fixtures/vislib/mock_data/date_histogram/_series');
var columns = require('fixtures/vislib/mock_data/date_histogram/_columns');
var rows = require('fixtures/vislib/mock_data/date_histogram/_rows');
var stackedSeries = require('fixtures/vislib/mock_data/date_histogram/_stacked_series');
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

dateHistogramArray.forEach(function (data, i) {
  describe('Vislib Handler Test Suite for ' + names[i] + ' Data', function () {
    var Handler;
    var vis;
    var events = [
      'click',
      'brush'
    ];

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      Handler = Private(require('ui/vislib/lib/handler/handler'));
      vis = Private(require('fixtures/vislib/_vis_fixture'))();
      vis.render(data);
    }));

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
            expect(chart.events.listenerCount(event)).to.be.above(0);
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
            expect(chart.events.listenerCount(event)).to.be(0);
          });
        });
      });

    });

    describe('removeAll Method', function () {
      beforeEach(function () {
        ngMock.inject(function () {
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
