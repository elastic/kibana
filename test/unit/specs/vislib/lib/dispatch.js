define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');
  var d3 = require('d3');

  // Data
  var data = require('vislib_fixtures/mock_data/date_histogram/_series');

  angular.module('DispatchClass', ['kibana']);

  describe('VisLib Dispatch Class Test Suite', function () {

    function destroyVis(vis) {
      $(vis.el).remove();
      vis = null;
    }

    function getEls(el, n, type) {
      return d3.select(el).data(new Array(n)).enter().append(type);
    }

    describe('', function () {
      var vis;
      var SimpleEmitter;

      beforeEach(module('AreaChartFactory'));
      beforeEach(inject(function (Private) {
        vis = Private(require('vislib_fixtures/_vis_fixture'))();
        vis.render(data);
        SimpleEmitter = require('utils/SimpleEmitter');
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

      beforeEach(module('AreaChartFactory'));
      beforeEach(inject(function (Private) {
        vis = Private(require('vislib_fixtures/_vis_fixture'))();
        require('css!components/vislib/styles/main');

        vis.on('brush', _.noop);

        vis.render(data);
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
        var chart;
        module('AreaChartFactory');
        inject(function (Private) {
          vis = Private(require('vislib_fixtures/_vis_fixture'))();
          vis.on('someEvent', _.noop);
          vis.render(data);

          vis.handler.charts.forEach(function (chart) {
            expect(chart.events.listenerCount('someEvent')).to.be(1);
          });

          destroyVis(vis);
          done();
        });
      });

      it('can be added after rendering', function () {
        var vis;
        var chart;
        module('AreaChartFactory');
        inject(function (Private) {
          vis = Private(require('vislib_fixtures/_vis_fixture'))();
          vis.render(data);
          vis.on('someEvent', _.noop);

          vis.handler.charts.forEach(function (chart) {
            expect(chart.events.listenerCount('someEvent')).to.be(1);
          });

          destroyVis(vis);
        });
      });
    });
  });
});
