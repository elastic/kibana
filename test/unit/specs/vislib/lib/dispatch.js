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

        vis.on('click', function (e) {
          return e;
        });

        vis.render(data);
      });
    });

    afterEach(function () {
      $(vis.el).remove();
      vis = null;
    });

    describe('eventResponse method', function () {
      it('should return an object', function () {
        vis.handler.charts.forEach(function (chart) {
          console.log($($('rect')[5]).trigger('click'));
          expect(_.isObject($(chart).trigger('click'))).to.be(true);
        });
      });
    });
    describe('addEvent method', function () {});
    describe('addHoverEvent method', function () {});
    describe('addClickEvent method', function () {});
    describe('addBrushEvent method', function () {});
    describe('addMousePointer method', function () {});
    describe('createBrush method', function () {});
  });
});
