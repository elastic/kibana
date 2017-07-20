import _ from 'lodash';
import d3 from 'd3';
import ngMock from 'ng_mock';
import expect from 'expect.js';

// Data
import data from 'fixtures/vislib/mock_data/date_histogram/_series';
import FixturesVislibVisFixtureProvider from 'fixtures/vislib/_vis_fixture';
import 'ui/persisted_state';
import { SimpleEmitter } from 'ui/utils/simple_emitter';

describe('Vislib Dispatch Class Test Suite', function () {

  function destroyVis(vis) {
    vis.destroy();
  }

  function getEls(el, n, type) {
    return d3.select(el).data(new Array(n)).enter().append(type);
  }

  describe('', function () {
    let vis;
    let persistedState;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, $injector) {
      vis = Private(FixturesVislibVisFixtureProvider)();
      persistedState = new ($injector.get('PersistedState'))();
      vis.render(data, persistedState);
    }));

    afterEach(function () {
      destroyVis(vis);
    });

    it('extends the SimpleEmitter class', function () {
      const events = _.pluck(vis.handler.charts, 'events');
      expect(events.length).to.be.above(0);
      events.forEach(function (dispatch) {
        expect(dispatch).to.be.a(SimpleEmitter);
      });
    });
  });

  describe('Stock event handlers', function () {
    let vis;
    let persistedState;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, $injector) {
      vis = Private(FixturesVislibVisFixtureProvider)();
      persistedState = new ($injector.get('PersistedState'))();
      vis.on('brush', _.noop);
      vis.render(data, persistedState);
    }));

    afterEach(function () {
      destroyVis(vis);
    });

    describe('addEvent method', function () {
      it('returns a function that binds the passed event to a selection', function () {
        const chart = _.first(vis.handler.charts);
        const apply = chart.events.addEvent('event', _.noop);
        expect(apply).to.be.a('function');

        const els = getEls(vis.el, 3, 'div');
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
          const chart = _.first(vis.handler.charts);
          const apply = chart.events[name](chart.series[0].chartEl);
          expect(apply).to.be.a('function');

          const els = getEls(vis.el, 3, 'div');
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
          const pointer = chart.events.addMousePointer;

          expect(_.isFunction(pointer)).to.be(true);
        });
      });
    });
  });

  describe('Custom event handlers', function () {
    it('should attach whatever gets passed on vis.on() to chart.events', function (done) {
      let vis;
      let persistedState;
      ngMock.module('kibana');
      ngMock.inject(function (Private, $injector) {
        vis = Private(FixturesVislibVisFixtureProvider)();
        persistedState = new ($injector.get('PersistedState'))();
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
      let vis;
      let persistedState;
      ngMock.module('kibana');
      ngMock.inject(function (Private, $injector) {
        vis = Private(FixturesVislibVisFixtureProvider)();
        persistedState = new ($injector.get('PersistedState'))();
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
