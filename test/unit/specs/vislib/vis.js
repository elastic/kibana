define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  var angular = require('angular');
  angular.module('VisFactory', ['kibana']);

  describe('VisLib Vis Test Suite', function () {
    var beforeEvent = 'click';
    var afterEvent = 'brush';
    var Vis;
    var vis;
    var el;
    var config;
    var data = {
      hits: 621,
      label: '',
      ordered: {
        date: true,
        interval: 30000,
        max: 1408734982458,
        min: 1408734082458
      },
      series: [{
        values: [{
          x: 1408734060000,
          y: 8
        }, {
          x: 1408734090000,
          y: 23
        }, {
          x: 1408734120000,
          y: 30
        }, {
          x: 1408734150000,
          y: 28
        }, {
          x: 1408734180000,
          y: 36
        }, {
          x: 1408734210000,
          y: 30
        }, {
          x: 1408734240000,
          y: 26
        }, {
          x: 1408734270000,
          y: 22
        }, {
          x: 1408734300000,
          y: 29
        }, {
          x: 1408734330000,
          y: 24
        }]
      }],
      tooltipFormatter: function (datapoint) {
        return datapoint;
      },
      xAxisFormatter: function (thing) {
        return thing;
      },
      xAxisLabel: 'Date Histogram',
      yAxisLabel: 'Count'
    };


    beforeEach(function () {
      module('VisFactory');
    });

    beforeEach(function () {
      inject(function (d3, Private) {
        Vis = Private(require('components/vislib/vis'));

        el = d3.select('body')
        .append('div')
          .attr('class', 'visualize');

        config = {
          type: 'histogram',
          shareYAxis: true,
          addTooltip: true,
          addLegend: true
        };

        vis = new Vis(el[0][0], config);
      });
    });

    afterEach(function () {
      vis.off(beforeEvent);
      vis.off(afterEvent);
      vis.destroy();
      el.remove();
    });

    describe('render Method', function () {
      beforeEach(function () {
        vis.render(data);
      });

      it('should bind data to this object', function () {
        expect(_.isObject(vis.data)).to.be(true);
      });

      it('should instantiate a handler object', function () {
        expect(_.isObject(vis.handler)).to.be(true);
      });

      it('should append a chart', function () {
        expect($('.chart').length).to.be(1);
      });
    });

    describe('destroy Method', function () {
      beforeEach(function () {
        vis.destroy();
      });

      it('should remove all DOM elements from el', function () {
        expect($('.vis-wrapper').length).to.be(0);
      });

      it('should turn off events', function () {});
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
        listeners = [];
        listener1 = function (e) {
          console.log(e, 'listener1');
        };
        listener2 = function (e) {
          console.log(e, 'listener2');
        };
        listeners.push(listener1);
        listeners.push(listener2);

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

      it('should add an event and its listeners to the _listeners object', function () {
        // Test for presence of beforeEvent in _listener object
        expect(vis._listeners[beforeEvent] instanceof Array).to.be(true);

        vis._listeners[beforeEvent].forEach(function (listener, i) {
          expect(typeof listener.handler).to.be('function');
          expect(listener.handler).to.be(listeners[i]);
        });

        vis._listeners[afterEvent].forEach(function (listener, i) {
          expect(typeof listener.handler).to.be('function');
          expect(listener.handler).to.be(listeners[i]);
        });
      });

      it('should add an event to the eventTypes.enabled array', function () {
        vis.eventTypes.enabled.forEach(function (eventType, i) {
          expect(eventType).to.be(events[i]);
        });
      });

      it('should attach an event and its listeners to the chart', function () {
        var charts = vis.handler.charts;

        charts.forEach(function (chart, i) {
          expect(typeof chart.on(beforeEvent) === 'function');
          expect(typeof chart.on(afterEvent) === 'function');
          expect(chart.on(beforeEvent) === listeners[i]);
          expect(chart.on(afterEvent) === listeners[i]);
        });
      });
    });

    describe('off Method', function () {
      var listeners;
      var listener1;
      var listener2;

      beforeEach(function () {
        listeners = [];
        listener1 = function (e) {
          console.log(e, 'listener1');
        };
        listener2 = function (e) {
          console.log(e, 'listener2');
        };
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

      it('should remove a listener from the _listeners[event] array', function () {
        var charts = vis.handler.charts;

        expect(vis._listeners[beforeEvent].length).to.be(1);
        expect(vis._listeners[afterEvent].length).to.be(1);

        // should still have the 2 events in the eventTypes enabled array
        expect(vis.eventTypes.enabled.length).to.be(2);

        // Test that listener that was not removed is still present
        vis._listeners[beforeEvent].forEach(function (listener) {
          expect(typeof listener.handler).to.be('function');
          expect(listener.handler).to.be(listener2);
        });

        vis._listeners[afterEvent].forEach(function (listener) {
          expect(typeof listener.handler).to.be('function');
          expect(listener.handler).to.be(listener2);
        });

        // Events should still be attached to charts
        charts.forEach(function (chart) {
          expect(typeof chart.on(beforeEvent)).to.be('function');
          expect(typeof chart.on(afterEvent)).to.be('function');
        });
      });

      it('should remove the event and all listeners when only event passed an argument', function () {
        var charts = vis.handler.charts;
        vis.off(afterEvent);

        // should remove 'brush' from _listeners object
        expect(vis._listeners[afterEvent]).to.be(undefined);

        // should remove 'brush' from eventTypes.enabled array
        expect(vis.eventTypes.enabled.length).to.be(1);

        // should remove the event from the charts
        charts.forEach(function (chart) {
          expect(typeof chart.on(afterEvent)).to.be('undefined');
        });
      });

      it('should remove the event from the eventTypes.enabled array as well as ' +
      'from the chart when the _listeners array has a length of 0', function () {
        var charts = vis.handler.charts;
        vis.off(afterEvent, listener2);

        expect(vis._listeners[afterEvent].length).to.be(0);
        expect(vis.eventTypes.enabled.length).to.be(1);

        charts.forEach(function (chart) {
          expect(typeof chart.on(afterEvent)).to.be('undefined');
        });
      });
    });

  });
});
