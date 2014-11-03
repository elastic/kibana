define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  var angular = require('angular');
  angular.module('VisFactory', ['kibana']);
  angular.module('DataFactory', ['kibana']);
  angular.module('HandlerFactory', ['kibana']);

  describe('VisLib Handler Test Suite', function () {
    var data = {
      hits      : 621,
      label     : '',
      ordered   : {
        date: true,
        interval: 30000,
        max     : 1408734982458,
        min     : 1408734082458
      },
      series    : [
        {
          values: [
            {
              x: 1408734060000,
              y: 8
            },
            {
              x: 1408734090000,
              y: 23
            },
            {
              x: 1408734120000,
              y: 30
            },
            {
              x: 1408734150000,
              y: 28
            },
            {
              x: 1408734180000,
              y: 36
            },
            {
              x: 1408734210000,
              y: 30
            },
            {
              x: 1408734240000,
              y: 26
            },
            {
              x: 1408734270000,
              y: 22
            },
            {
              x: 1408734300000,
              y: 29
            },
            {
              x: 1408734330000,
              y: 24
            }
          ]
        }
      ],
      tooltipFormatter: function (datapoint) {
        return datapoint;
      },
      xAxisFormatter: function (thing) {
        return thing;
      },
      xAxisLabel: 'Date Histogram',
      yAxisLabel: 'Count'
    };
    var Vis;
    var Data;
    var Handler;
    var handler;
    var ColumnHandler;
    var vis;
    var el;
    var config;
    var events;

    beforeEach(function () {
      module('VisFactory');
      module('HandlerFactory');
      module('DataFactory');
    });

    beforeEach(function () {
      inject(function (d3, Private) {
        Vis = Private(require('components/vislib/vis'));
        Data = Private(require('components/vislib/lib/data'));
        Handler = Private(require('components/vislib/lib/handler/handler'));
        ColumnHandler = Private(require('components/vislib/lib/handler/types/column'));

        el = d3.select('body').append('div')
          .attr('class', 'visualize');

        config = {
          type: 'histogram',
          shareYAxis: true,
          addTooltip: true,
          addLegend: true
        };

        events = [
          'click',
          'brush'
        ];

        vis = new Vis(el[0][0], config);
        vis.render(data);
      });
    });

    afterEach(function () {
      vis.destroy();
      el.remove();
    });

    describe('render Method', function () {
      //it('should instantiate all constructors ', function () {
      //  expect(!!vis.handler.layout).to.be(true);
      //  expect(!!vis.handler.xAxis).to.be(true);
      //  expect(!!vis.handler.yAxis).to.be(true);
      //  expect(!!vis.handler.axisTitle).to.be(true);
      //  expect(!!vis.handler.chartTitle).to.be(true);
      //});
      //
      //it('should append all DOM Elements for the visualization', function () {
      //  expect($('.vis-wrapper').length).to.be(1);
      //  expect($('.y-axis-col-wrapper').length).to.be(1);
      //  expect($('.vis-col-wrapper').length).to.be(1);
      //  expect($('.y-axis-col').length).to.be(1);
      //  expect($('.y-axis-title').length).to.be(1);
      //  expect($('.y-axis-chart-title').length).to.be(0);
      //  expect($('.y-axis-div-wrapper').length).to.be(1);
      //  expect($('.y-axis-spacer-block').length).to.be(1);
      //  expect($('.chart-wrapper').length).to.be(1);
      //  expect($('.x-axis-wrapper').length).to.be(1);
      //  expect($('.x-axis-div-wrapper').length).to.be(1);
      //  expect($('.x-axis-chart-title').length).to.be(0);
      //  expect($('.x-axis-title').length).to.be(1);
      //  expect($('svg').length).to.be(5);
      //});
    });

    describe('enable Method', function () {
      var charts;

      beforeEach(function () {
        charts = vis.handler.charts;

        charts.forEach(function (chart) {
          events.forEach(function (event) {
            vis.handler.enable(event, chart);
          });
        });
      });

      it('should add events to chart and emit to the Events class', function () {
        charts.forEach(function (chart, i) {
          expect(typeof chart.on(events[i])).to.be('function');
        });
      });
    });

    describe('disable Method', function () {
      var charts;

      beforeEach(function () {
        charts = vis.handler.charts;

        charts.forEach(function (chart) {
          events.forEach(function (event) {
            vis.handler.disable(event, chart);
          });
        });
      });

      it('should remove events from the chart', function () {
        charts.forEach(function (chart, i) {
          expect(typeof chart.on(events[i])).to.be('undefined');
        });
      });

    });

    describe('removeAll Method', function () {
      beforeEach(function () {
        inject(function () {
          vis.handler.removeAll(el[0][0]);
        });
      });

      it('should remove all DOM elements from the el', function () {
        expect($(el).children().length).to.be(0);
      });
    });

    describe('error Method', function () {
      beforeEach(function () {
        vis.handler.error('This is an error!');
      });

      it('should return an error classed DOM element with a text message', function () {
        expect($('.visualize').find('.error').length).to.be(1);
        expect($('.error p').html()).to.be('This is an error!');
      });
    });

  });
});
