
import angular from 'angular';
import ngMock from 'ng_mock';
import expect from 'expect.js';

// Data
import series from 'fixtures/vislib/mock_data/date_histogram/_series';
import columns from 'fixtures/vislib/mock_data/date_histogram/_columns';
import rows from 'fixtures/vislib/mock_data/date_histogram/_rows';
import stackedSeries from 'fixtures/vislib/mock_data/date_histogram/_stacked_series';
import $ from 'jquery';
import VislibLibHandlerHandlerProvider from 'ui/vislib/lib/handler/handler';
import FixturesVislibVisFixtureProvider from 'fixtures/vislib/_vis_fixture';
import PersistedStatePersistedStateProvider from 'ui/persisted_state/persisted_state';
let dateHistogramArray = [
  series,
  columns,
  rows,
  stackedSeries
];
let names = [
  'series',
  'columns',
  'rows',
  'stackedSeries'
];

dateHistogramArray.forEach(function (data, i) {
  describe('Vislib Handler Test Suite for ' + names[i] + ' Data', function () {
    let Handler;
    let vis;
    let persistedState;
    let events = [
      'click',
      'brush'
    ];

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      Handler = Private(VislibLibHandlerHandlerProvider);
      vis = Private(FixturesVislibVisFixtureProvider)();
      persistedState = new (Private(PersistedStatePersistedStateProvider))();
      vis.render(data, persistedState);
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
      let charts;

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
      let charts;

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
