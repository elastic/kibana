var d3 = require('d3');
var angular = require('angular');
var $ = require('jquery');
var ngMock = require('ngMock');
var expect = require('expect.js');

// Data
var series = require('fixtures/vislib/mock_data/date_histogram/_series');
var columns = require('fixtures/vislib/mock_data/date_histogram/_columns');
var rows = require('fixtures/vislib/mock_data/date_histogram/_rows');
var stackedSeries = require('fixtures/vislib/mock_data/date_histogram/_stacked_series');
var dateHistogramArray = [
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

dateHistogramArray.forEach(function (data, i) {
  describe('Vislib Layout Class Test Suite for ' + names[i] + ' Data', function () {
    var Layout;
    var vis;
    var persistedState;
    var numberOfCharts;
    var testLayout;

    beforeEach(ngMock.module('kibana'));

    beforeEach(function () {
      ngMock.inject(function (Private) {
        Layout = Private(require('ui/vislib/lib/layout/layout'));
        vis = Private(require('fixtures/vislib/_vis_fixture'))();
        persistedState = new (Private(require('ui/persisted_state/persisted_state')))();
        vis.render(data, persistedState);
        numberOfCharts = vis.handler.charts.length;
      });
    });

    afterEach(function () {
      $(vis.el).remove();
      vis = null;
    });

    describe('createLayout Method', function () {
      it('should append all the divs', function () {
        expect($(vis.el).find('.vis-wrapper').length).to.be(1);
        expect($(vis.el).find('.y-axis-col-wrapper').length).to.be(1);
        expect($(vis.el).find('.vis-col-wrapper').length).to.be(1);
        expect($(vis.el).find('.y-axis-col').length).to.be(1);
        expect($(vis.el).find('.y-axis-title').length).to.be(1);
        expect($(vis.el).find('.y-axis-div-wrapper').length).to.be(1);
        expect($(vis.el).find('.y-axis-spacer-block').length).to.be(1);
        expect($(vis.el).find('.chart-wrapper').length).to.be(numberOfCharts);
        expect($(vis.el).find('.x-axis-wrapper').length).to.be(1);
        expect($(vis.el).find('.x-axis-div-wrapper').length).to.be(1);
        expect($(vis.el).find('.x-axis-title').length).to.be(1);
      });
    });

    describe('layout Method', function () {
      beforeEach(function () {
        testLayout = new Layout(vis.el, vis.data, 'histogram');
      });

      it('should append a div with the correct class name', function () {
        expect($(vis.el).find('.chart').length).to.be(numberOfCharts);
      });

      it('should bind data to the DOM element', function () {
        expect(!!$(vis.el).find('.chart').data()).to.be(true);
      });

      it('should create children', function () {
        expect(typeof $(vis.el).find('.x-axis-div')).to.be('object');
      });

      it('should call split function when provided', function () {
        expect(typeof $(vis.el).find('.x-axis-div')).to.be('object');
      });

      it('should throw errors when incorrect arguments provided', function () {
        expect(function () {
          testLayout.layout({
            parent: vis.el,
            type: undefined,
            class: 'chart'
          });
        }).to.throwError();

        expect(function () {
          testLayout.layout({
            type: 'div',
            class: 'chart'
          });
        }).to.throwError();

        expect(function () {
          testLayout.layout({
            parent: 'histogram',
            type: 'div'
          });
        }).to.throwError();

        expect(function () {
          testLayout.layout({
            parent: vis.el,
            type: function (d) { return d; },
            class: 'chart'
          });
        }).to.throwError();
      });
    });

    describe('appendElem Method', function () {
      beforeEach(function () {
        vis.handler.layout.appendElem(vis.el, 'svg', 'column');
        vis.handler.layout.appendElem('.visualize-chart', 'div', 'test');
      });

      it('should append DOM element to el with a class name', function () {
        expect(typeof $(vis.el).find('.column')).to.be('object');
        expect(typeof $(vis.el).find('.test')).to.be('object');
      });
    });

    describe('removeAll Method', function () {
      beforeEach(function () {
        d3.select(vis.el).append('div').attr('class', 'visualize');
        vis.handler.layout.removeAll(vis.el);
      });

      it('should remove all DOM elements from the el', function () {
        expect($(vis.el).children().length).to.be(0);
      });
    });
  });
});
