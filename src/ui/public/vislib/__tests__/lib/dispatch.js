let angular = require('angular');
let _ = require('lodash');
let $ = require('jquery');
let d3 = require('d3');
let ngMock = require('ngMock');
let expect = require('expect.js');

// Data
let data = require('fixtures/vislib/mock_data/date_histogram/_series');

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
    let SimpleEmitter;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      vis = Private(require('fixtures/vislib/_vis_fixture'))();
      persistedState = new (Private(require('ui/persisted_state/persisted_state')))();
      vis.render(data, persistedState);
      SimpleEmitter = require('ui/utils/SimpleEmitter');
    }));

    afterEach(function () {
      destroyVis(vis);
    });

    it('extends the SimpleEmitter class', function () {
      let events = _.pluck(vis.handler.charts, 'events');
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
    beforeEach(ngMock.inject(function (Private) {
      vis = Private(require('fixtures/vislib/_vis_fixture'))();
      persistedState = new (Private(require('ui/persisted_state/persisted_state')))();
      vis.on('brush', _.noop);
      vis.render(data, persistedState);
    }));

    afterEach(function () {
      destroyVis(vis);
    });

    describe('addEvent method', function () {
      it('returns a function that binds the passed event to a selection', function () {
        let chart = _.first(vis.handler.charts);
        let apply = chart.events.addEvent('event', _.noop);
        expect(apply).to.be.a('function');

        let els = getEls(vis.el, 3, 'div');
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
          let chart = _.first(vis.handler.charts);
          let apply = chart.events[name](d3.select(document.createElement('svg')));
          expect(apply).to.be.a('function');

          let els = getEls(vis.el, 3, 'div');
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
          let pointer = chart.events.addMousePointer;

          expect(_.isFunction(pointer)).to.be(true);
        });
      });
    });
  });

  describe('Custom event handlers', function () {
    it('should attach whatever gets passed on vis.on() to chart.events', function (done) {
      let vis;
      let persistedState;
      let chart;
      ngMock.module('kibana');
      ngMock.inject(function (Private) {
        vis = Private(require('fixtures/vislib/_vis_fixture'))();
        persistedState = new (Private(require('ui/persisted_state/persisted_state')))();
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
      let chart;
      ngMock.module('kibana');
      ngMock.inject(function (Private) {
        vis = Private(require('fixtures/vislib/_vis_fixture'))();
        persistedState = new (Private(require('ui/persisted_state/persisted_state')))();
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
