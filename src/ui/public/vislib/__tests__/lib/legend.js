var d3 = require('d3');
var angular = require('angular');
var _ = require('lodash');
var $ = require('jquery');
var ngMock = require('ngMock');
var expect = require('expect.js');

var slices = require('fixtures/vislib/mock_data/histogram/_slices');
var stackedSeries = require('fixtures/vislib/mock_data/date_histogram/_stacked_series');
var histogramSlices = require('fixtures/vislib/mock_data/histogram/_slices');

var dataArray = [
  stackedSeries,
  slices,
  histogramSlices,
  stackedSeries,
  stackedSeries
];

var chartTypes = [
  'histogram',
  'pie',
  'pie',
  'area',
  'line'
];

var chartSelectors = {
  histogram: '.chart rect',
  pie: '.chart path',
  area: '.chart path',
  line: '.chart circle'
};

dataArray.forEach(function (data, i) {
  describe('Vislib Legend Class Test Suite for ' + chartTypes[i] + ' data', function () {
    var visLibParams = {
      type: chartTypes[i],
      addLegend: true
    };
    var Legend;
    var vis;
    var $el;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      vis = Private(require('fixtures/vislib/_vis_fixture'))(visLibParams);
      Legend = Private(require('ui/vislib/lib/legend'));
      $el = d3.select('body').append('div').attr('class', 'fake-legend');
      vis.render(data);
    }));

    afterEach(function () {
      $(vis.el).remove();
      $('.fake-legend').remove();
      vis = null;
    });

    describe('legend item label matches vis item label', function () {
      it('should match the slice label', function () {
        var chartType = chartTypes[i];
        var paths = $(vis.el).find(chartSelectors[chartType]).toArray();
        var items = vis.handler.legend.labels;

        items.forEach(function (d) {
          var path = _.find(paths, function (path) {
            return path.getAttribute('data-label') === String(d.label);
          });

          expect(path).to.be.ok();
        });
      });
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
      it('should not return an undefined value', function () {
        var emptyObject = {
          label: ''
        };
        var labels = [emptyObject, emptyObject, emptyObject];
        var args = {
          _attr: {isOpen: true},
          color: function () { return 'blue'; }
        };

        Legend.prototype._list($el, labels, args);

        $el.selectAll('li').each(function (d) {
          expect(d.label).not.to.be(undefined);
        });
      });
    });

    describe('render method', function () {
      it('should create a legend toggle', function () {
        expect($('.legend-toggle').length).to.be(1);
      });

      it('should have an onclick listener', function () {
        expect(!!$('.legend-toggle')[0].__onclick).to.be(true);
        expect(!!$('li.color')[0].__onclick).to.be(true);
      });

      it('should attach onmouseover listener', function () {
        expect(!!$('li.color')[0].__onmouseover).to.be(true);
      });
    });
  });
});
