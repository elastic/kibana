define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  // Data
  var data = require('vislib_fixtures/mock_data/date_histogram/_series');

  angular.module('DispatchClass', ['kibana']);

  describe('VisLib Dispatch Class Test Suite', function () {
    var vis;

    beforeEach(function () {
      module('AreaChartFactory');
    });

    beforeEach(function () {
      inject(function (Private) {
        vis = Private(require('vislib_fixtures/_vis_fixture'))();
        require('css!components/vislib/styles/main');

        vis.on('brush', function (e) {
          console.log(e);
        });

        vis.render(data);
      });
    });

    afterEach(function () {
      $(vis.el).remove();
      vis = null;
    });

    describe('addEvent method', function () {
      it('should return a function', function () {
        vis.handler.charts.forEach(function (chart) {
          var clickEvent = function (e) {
            console.log(e);
          };
          var addEvent = chart.events.addEvent;

          expect(_.isFunction(addEvent('click', clickEvent))).to.be(true);
        });
      });
    });

    describe('addHoverEvent method', function () {
      it('should return a function', function () {
        vis.handler.charts.forEach(function (chart) {
          var hover = chart.events.addHoverEvent;

          expect(_.isFunction(hover)).to.be(true);
        });
      });

      it('should attach a hover event', function () {
        vis.handler.charts.forEach(function (chart) {
          expect(_.isFunction(chart.events.dispatch.hover)).to.be(true);
        });
      });
    });

    describe('addClickEvent method', function () {
      it('should return a function', function () {
        vis.handler.charts.forEach(function (chart) {
          var click = chart.events.addClickEvent;

          expect(_.isFunction(click)).to.be(true);
        });
      });

      it('should attach a click event', function () {
        vis.handler.charts.forEach(function (chart) {
          expect(_.isFunction(chart.events.dispatch.click)).to.be(true);
        });
      });
    });

    describe('addBrushEvent method', function () {
      it('should return a function', function () {
        vis.handler.charts.forEach(function (chart) {
          var brush = chart.events.addBrushEvent;

          expect(_.isFunction(brush)).to.be(true);
        });
      });

      it('should attach a brush event', function () {
        vis.handler.charts.forEach(function (chart) {
          expect(_.isFunction(chart.events.dispatch.brush)).to.be(true);
        });
      });
    });

    describe('addMousePointer method', function () {
      it('should return a function', function () {
        vis.handler.charts.forEach(function (chart) {
          var pointer = chart.events.addMousePointer;

          expect(_.isFunction(pointer)).to.be(true);
        });
      });
    });
  });
});
