import angular from 'angular';
import _ from 'lodash';
import d3 from 'd3';
import ngMock from 'ngMock';
import expect from 'expect.js';

// Data
import data from 'fixtures/vislib/mock_data/date_histogram/_series';
import $ from 'jquery';
import FixturesVislibVisFixtureProvider from 'fixtures/vislib/_vis_fixture';
import PersistedStatePersistedStateProvider from 'ui/persisted_state/persisted_state';

describe('Vislib Dispatch Class Test Suite', function () {

  function destroyVis(vis) {
    $(vis.el).remove();
    vis = null;
  }

  function getEls(el, n, type) {
    return d3.select(el).data(new Array(n)).enter().append(type);
  }

  describe('', function () {
    var vis;
    var persistedState;
    var SimpleEmitter;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      vis = Private(FixturesVislibVisFixtureProvider)();
      persistedState = new (Private(PersistedStatePersistedStateProvider))();
      vis.render(data, persistedState);
      SimpleEmitter = require('ui/utils/SimpleEmitter');
    }));

    afterEach(function () {
      destroyVis(vis);
    });

    it('extends the SimpleEmitter class', function () {
      var events = _.pluck(vis.handler.charts, 'events');
      expect(events.length).to.be.above(0);
      events.forEach(function (dispatch) {
        expect(dispatch).to.be.a(SimpleEmitter);
      });
    });
  });

  describe('Stock event handlers', function () {
    var vis;
    var persistedState;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      vis = Private(FixturesVislibVisFixtureProvider)();
      persistedState = new (Private(PersistedStatePersistedStateProvider))();
      vis.on('brush', _.noop);
      vis.render(data, persistedState);
    }));

    afterEach(function () {
      destroyVis(vis);
    });

    describe('addEvent method', function () {
      it('returns a function that binds the passed event to a selection', function () {
        var chart = _.first(vis.handler.charts);
        var apply = chart.events.addEvent('event', _.noop);
        expect(apply).to.be.a('function');

        var els = getEls(vis.el, 3, 'div');
        apply(els);
        els.each(function () {
          expect(d3.select(this).on('event')).to.be(_.noop);
        });
      });
    });

    // test the addHoverEvent, addClickEvent, addBrushEvent methods by
    // checking that they return function which bind the events expected
    function checkBoundAddMethod(name, event) {
      describe(name + ' method', function () {
        it('should be a function', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(chart.events[name]).to.be.a('function');
          });
        });

        it('returns a function that binds ' + event + ' events to a selection', function () {
          var chart = _.first(vis.handler.charts);
          var apply = chart.events[name](d3.select(document.createElement('svg')));
          expect(apply).to.be.a('function');

          var els = getEls(vis.el, 3, 'div');
          apply(els);
          els.each(function () {
            expect(d3.select(this).on(event)).to.be.a('function');
          });
        });
      });
    }

    checkBoundAddMethod('addHoverEvent', 'mouseover');
    checkBoundAddMethod('addMouseoutEvent', 'mouseout');
    checkBoundAddMethod('addClickEvent', 'click');
    checkBoundAddMethod('addBrushEvent', 'mousedown');

    describe('addMousePointer method', function () {
      it('should be a function', function () {
        vis.handler.charts.forEach(function (chart) {
          var pointer = chart.events.addMousePointer;

          expect(_.isFunction(pointer)).to.be(true);
        });
      });
    });
  });

  describe('Custom event handlers', function () {
    it('should attach whatever gets passed on vis.on() to chart.events', function (done) {
      var vis;
      var persistedState;
      var chart;
      ngMock.module('kibana');
      ngMock.inject(function (Private) {
        vis = Private(FixturesVislibVisFixtureProvider)();
        persistedState = new (Private(PersistedStatePersistedStateProvider))();
        vis.on('someEvent', _.noop);
        vis.render(data, persistedState);

        vis.handler.charts.forEach(function (chart) {
          expect(chart.events.listenerCount('someEvent')).to.be(1);
        });

        destroyVis(vis);
        done();
      });
    });

    it('can be added after rendering', function () {
      var vis;
      var persistedState;
      var chart;
      ngMock.module('kibana');
      ngMock.inject(function (Private) {
        vis = Private(FixturesVislibVisFixtureProvider)();
        persistedState = new (Private(PersistedStatePersistedStateProvider))();
        vis.render(data, persistedState);
        vis.on('someEvent', _.noop);

        vis.handler.charts.forEach(function (chart) {
          expect(chart.events.listenerCount('someEvent')).to.be(1);
        });

        destroyVis(vis);
      });
    });
  });
});
