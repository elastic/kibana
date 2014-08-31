define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  var angular = require('angular');
  angular.module('VisFactory', ['kibana']);

  describe('VisLib Vis Test Suite', function () {
    var Vis;
    var chart;
    var el;
    var config;
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


    beforeEach(function () {
      module('VisFactory');
    });

    beforeEach(function () {
      inject(function (d3, Private) {
        Vis = Private(require('components/vislib/vis'));

        el = d3.select('body').append('div')
          .attr('class', 'visualize')[0][0];

        config = {
          type: 'histogram',
          shareYAxis: true,
          addTooltip: true,
          addLegend: true
        };
        chart = new Vis(el, config);
      });
    });

    afterEach(function () {
      el.remove();
      chart.destroy();
    });

    describe('render Method', function () {
      beforeEach(function () {
        chart.render(data);
      });

      it('should bind data to this object', function () {
        expect(_.isObject(chart.data)).to.be(true);
      });

      it('should instantiate a handler object', function () {
        expect(_.isObject(chart.handler)).to.be(true);
      });

      it('should append a chart', function () {
        expect($('.chart').length).to.be(1);
      });

      it('should call the checkSize function', function () {});
    });

    describe('checkSize Method', function () {
//      beforeEach(function () {
//        chart.render(data);
//        $('.chart').width(500);
//      });
//
//      it('should set prevSize on the object', function () {
//        expect(!!chart.prevSize).to.be(true);
//      });
//
//      it('should return nothing when an argument is passed', function () {
//        console.log(chart.checkSize);
//        expect(chart.checkSize(false)).to.be(true);
//      });

    });

    describe('resize Method', function () {
      beforeEach(function () {
        chart.render(data);
        $('.visualize').width(500);
        chart.resize();
        chart.destroy();
      });

      it('should resize the chart', function () {
        "use strict";
        expect($('.chart').width()).to.be.lessThan(500);
      });

      it('should throw an error when no valid data provided', function () {
        expect(function () {
          chart.resize();
        }).to.throwError();
      });
    });

    describe('destroy Method', function () {
      beforeEach(function () {
        chart.destroy();
      });

      it('should set the destroyFlag to true', function () {
        expect(chart._attr.destroyFlag).to.be(true);
      });

      it('should remove all DOM elements from el', function () {
        expect($('.vis-wrapper').length).to.be(0);
      });

      it('should turn off events', function () {});
    });

    describe('set Method', function () {
      beforeEach(function () {
        chart.render(data);
        chart.set('addLegend', false);
        chart.set('offset', 'wiggle');
      });

      it('should set an attribute', function () {
        expect(chart.get('addLegend')).to.be(false);
        expect(chart.get('offset')).to.be('wiggle');
      });
    });

    describe('get Method', function () {
      beforeEach(function () {
        chart.render(data);
      });

      it('should get attribue values', function () {
        expect(chart.get('addLegend')).to.be(true);
        expect(chart.get('addTooltip')).to.be(true);
        expect(chart.get('type')).to.be('histogram');
        expect(chart.get('offset')).to.be('zero');
      });
    });

  });
});