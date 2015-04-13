define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  var slices = require('vislib_fixtures/mock_data/histogram/_slices');
  var stackedSeries = require('vislib_fixtures/mock_data/date_histogram/_stacked_series');

  var dataArray = [
    stackedSeries,
    slices,
    stackedSeries,
    stackedSeries,
  ];

  var chartTypes = [
    'histogram',
    'pie',
    'area',
    'line'
  ];

  angular.module('LegendFactory', ['kibana']);

  dataArray.forEach(function (data, i) {
    describe('Vislib Legend Class Test Suite for ' + chartTypes[i] + ' data', function () {
      var visLibParams = {
        type: chartTypes[i],
        addLegend: true
      };
      var vis;

      beforeEach(function () {
        module('LegendFactory');
      });

      beforeEach(function () {
        inject(function (Private) {
          vis = Private(require('vislib_fixtures/_vis_fixture'))(visLibParams);
          require('css!components/vislib/styles/main');

          vis.render(data);
        });
      });

      afterEach(function () {
        $(vis.el).remove();
        vis = null;
      });

      describe('legend item color matches slice color', function () {
        var items;
        var paths;
        var getColor;

        if (chartTypes[i] === 'pie') {
          it('should match the slice color', function () {
            paths = $(vis.el).find('path').toArray();
            items = vis.handler.legend.labels;
            getColor = vis.handler.legend.color;

            items.forEach(function (label) {
              var slices = paths.filter(function (path) {
                if (path.__data__.name === undefined) return false;
                return path.__data__.name.toString() === label;
              }).map(function (path) {
                return $(path).attr('class').split(/\s+/)[1].replace('c', '#');
              });

              slices.forEach(function (hex) {
                expect(hex).to.be(getColor(label));
              });
            });
          });
        }
      });

      describe('header method', function () {
        it('should append the legend header', function () {
          expect($(vis.el).find('.header').length).to.be(1);
          expect($(vis.el).find('.column-labels').length).to.be(1);
        });
      });

      describe('list method', function () {
        it('should append the legend list', function () {
          expect($(vis.el).find('.legend-ul').length).to.be(1);
        });
        it('should contain a list of items', function () {
          expect($(vis.el).find('li').length).to.be.greaterThan(1);
        });
      });

      describe('render method', function () {
        it('should create a legend toggle', function () {
          expect($('.legend-toggle').length).to.be(1);
        });

        it('should have an onclick listener', function () {
          expect(!!$('.legend-toggle')[0].__onclick).to.be(true);
        });

        it('should attach onmouseover listener', function () {
          expect(!!$('li.color')[0].__onmouseover).to.be(true);
        });
      });
    });
  });
});
