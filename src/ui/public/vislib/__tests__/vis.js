var _ = require('lodash');
var $ = require('jquery');
var d3 = require('d3');
var expect = require('expect.js');
var ngMock = require('ngMock');

var series = require('fixtures/vislib/mock_data/date_histogram/_series');
var columns = require('fixtures/vislib/mock_data/date_histogram/_columns');
var rows = require('fixtures/vislib/mock_data/date_histogram/_rows');
var stackedSeries = require('fixtures/vislib/mock_data/date_histogram/_stacked_series');

var dataArray = [
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


dataArray.forEach(function (data, i) {
  describe('Vislib Vis Test Suite for ' + names[i] + ' Data', function () {
    var beforeEvent = 'click';
    var afterEvent = 'brush';
    var vis;
    var secondVis;
    var numberOfCharts;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      vis = Private(require('fixtures/vislib/_vis_fixture'))();
      secondVis = Private(require('fixtures/vislib/_vis_fixture'))();
    }));

    afterEach(function () {
      $(vis.el).remove();
      $(secondVis.el).remove();
      vis = null;
    });

    describe('render Method', function () {
      beforeEach(function () {
        vis.render(data);
        numberOfCharts = vis.handler.charts.length;
      });

      it('should bind data to this object', function () {
        expect(_.isObject(vis.data)).to.be(true);
      });

      it('should instantiate a handler object', function () {
        expect(_.isObject(vis.handler)).to.be(true);
      });

      it('should append a chart', function () {
        expect($('.chart').length).to.be(numberOfCharts);
      });

    });

    describe('resize Method', function () {
      beforeEach(function () {
        vis.render(data);
        vis.resize();
        numberOfCharts = vis.handler.charts.length;
      });

      it('should throw an error', function () {
        expect(function () {
          vis.data = undefined;
          vis.render();
        }).to.throwError();
      });

      it('should resize the visualization', function () {
        expect(vis.handler.charts.length).to.be(numberOfCharts);
      });
    });

    describe('destroy Method', function () {
      beforeEach(function () {
        vis.render(data);
        secondVis.render(data);
        secondVis.destroy();
      });

      it('should remove all DOM elements from el', function () {
        expect($(secondVis.el).find('.vis-wrapper').length).to.be(0);
      });

      it('should not remove visualizations that have not been destroyed', function () {
        expect($(vis.el).find('.vis-wrapper').length).to.be(1);
      });
    });

    describe('set Method', function () {
      beforeEach(function () {
        vis.render(data);
        vis.set('addLegend', false);
        vis.set('offset', 'wiggle');
      });

      it('should set an attribute', function () {
        expect(vis.get('addLegend')).to.be(false);
        expect(vis.get('offset')).to.be('wiggle');
      });
    });

    describe('get Method', function () {
      beforeEach(function () {
        vis.render(data);
      });

      it('should get attribue values', function () {
        expect(vis.get('addLegend')).to.be(true);
        expect(vis.get('addTooltip')).to.be(true);
        expect(vis.get('type')).to.be('histogram');
      });
    });

    describe('on Method', function () {
      var events = [
        beforeEvent,
        afterEvent
      ];
      var listeners;
      var listener1;
      var listener2;

      beforeEach(function () {
        listeners = [
          listener1 = function () {},
          listener2 = function () {}
        ];

        // Add event and listeners to chart
        listeners.forEach(function (listener) {
          vis.on(beforeEvent, listener);
        });

        // Render chart
        vis.render(data);

        // Add event after charts have rendered
        listeners.forEach(function (listener) {
          vis.on(afterEvent, listener);
        });
      });

      afterEach(function () {
        vis.off(beforeEvent);
        vis.off(afterEvent);
      });

      it('should add an event and its listeners', function () {
        listeners.forEach(function (listener) {
          expect(vis.listeners(beforeEvent)).to.contain(listener);
        });

        listeners.forEach(function (listener) {
          expect(vis.listeners(afterEvent)).to.contain(listener);
        });
      });

      it('should cause a listener for each event to be attached to each chart', function () {
        var charts = vis.handler.charts;

        charts.forEach(function (chart, i) {
          expect(chart.events.listenerCount(beforeEvent)).to.be.above(0);
          expect(chart.events.listenerCount(afterEvent)).to.be.above(0);
        });
      });
    });

    describe('off Method', function () {
      var listeners;
      var listener1;
      var listener2;

      beforeEach(function () {
        listeners = [];
        listener1 = function () {};
        listener2 = function () {};
        listeners.push(listener1);
        listeners.push(listener2);

        // Add event and listeners to chart
        listeners.forEach(function (listener) {
          vis.on(beforeEvent, listener);
        });

        // Turn off event listener before chart rendered
        vis.off(beforeEvent, listener1);

        // Render chart
        vis.render(data);

        // Add event after charts have rendered
        listeners.forEach(function (listener) {
          vis.on(afterEvent, listener);
        });

        // Turn off event listener after chart is rendered
        vis.off(afterEvent, listener1);
      });

      afterEach(function () {
        vis.off(beforeEvent);
        vis.off(afterEvent);
      });

      it('should remove a listener', function () {
        var charts = vis.handler.charts;

        expect(vis.listeners(beforeEvent)).to.not.contain(listener1);
        expect(vis.listeners(beforeEvent)).to.contain(listener2);

        expect(vis.listeners(afterEvent)).to.not.contain(listener1);
        expect(vis.listeners(afterEvent)).to.contain(listener2);

        // Events should still be attached to charts
        charts.forEach(function (chart) {
          expect(chart.events.listenerCount(beforeEvent)).to.be.above(0);
          expect(chart.events.listenerCount(afterEvent)).to.be.above(0);
        });
      });

      it('should remove the event and all listeners when only event passed an argument', function () {
        var charts = vis.handler.charts;
        vis.off(afterEvent);

        // should remove 'brush' event
        expect(vis.listeners(beforeEvent)).to.contain(listener2);
        expect(vis.listeners(afterEvent)).to.not.contain(listener2);

        // should remove the event from the charts
        charts.forEach(function (chart) {
          expect(chart.events.listenerCount(beforeEvent)).to.be.above(0);
          expect(chart.events.listenerCount(afterEvent)).to.be(0);
        });
      });

      it('should remove the event from the chart when the last listener is removed', function () {
        var charts = vis.handler.charts;
        vis.off(afterEvent, listener2);

        expect(vis.listenerCount(afterEvent)).to.be(0);

        charts.forEach(function (chart) {
          expect(chart.events.listenerCount(afterEvent)).to.be(0);
        });
      });
    });
  });
});
