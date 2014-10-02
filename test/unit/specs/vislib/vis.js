define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  var angular = require('angular');
  angular.module('VisFactory', ['kibana']);

  describe('VisLib Vis Test Suite', function () {
    var Vis;
    var vis;
    var el;
    var config;
    var data = {
      hits: 621,
      label: '',
      ordered: {
        date: true,
        interval: 30000,
        max: 1408734982458,
        min: 1408734082458
      },
      series: [{
        values: [{
          x: 1408734060000,
          y: 8
        }, {
          x: 1408734090000,
          y: 23
        }, {
          x: 1408734120000,
          y: 30
        }, {
          x: 1408734150000,
          y: 28
        }, {
          x: 1408734180000,
          y: 36
        }, {
          x: 1408734210000,
          y: 30
        }, {
          x: 1408734240000,
          y: 26
        }, {
          x: 1408734270000,
          y: 22
        }, {
          x: 1408734300000,
          y: 29
        }, {
          x: 1408734330000,
          y: 24
        }]
      }],
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

        el = d3.select('body')
        .append('div')
          .attr('class', 'visualize');

        config = {
          type: 'histogram',
          shareYAxis: true,
          addTooltip: true,
          addLegend: true
        };

        vis = new Vis(el[0][0], config);
      });
    });

    afterEach(function () {
      el.remove();
      vis.destroy();
    });

    describe('render Method', function () {
      beforeEach(function () {
        vis.render(data);
      });

      it('should bind data to this object', function () {
        expect(_.isObject(vis.data)).to.be(true);
      });

      it('should instantiate a handler object', function () {
        expect(_.isObject(vis.handler)).to.be(true);
      });

      it('should append a chart', function () {
        expect($('.chart').length).to.be(1);
      });
    });

    describe('destroy Method', function () {
      beforeEach(function () {
        vis.destroy();
      });

      it('should remove all DOM elements from el', function () {
        expect($('.vis-wrapper').length).to.be(0);
      });

      it('should turn off events', function () {});
    });

    describe('set Method', function () {
      beforeEach(function () {
        vis.render(data);
        vis.set('addLegend', false);
        vis.set('offset', 'wiggle');
      });

      it('should set an attribute', function () {
        expect(vis.get('addLegend')).to.be(false);
        expect(vis.get('offset')).to.be('wiggle');
      });
    });

    describe('get Method', function () {
      beforeEach(function () {
        vis.render(data);
      });

      it('should get attribue values', function () {
        expect(vis.get('addLegend')).to.be(true);
        expect(vis.get('addTooltip')).to.be(true);
        expect(vis.get('type')).to.be('histogram');
      });
    });
  });
});
