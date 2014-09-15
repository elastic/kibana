define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  angular.module('AxisTitleFactory', ['kibana']);

  describe('Vislib AxisTitle Class Test Suite', function () {
    var AxisTitle;
    var Data;
    var axisTitle;
    var el;
    var dataObj;
    var xTitle;
    var yTitle;
    var data = {
      hits: 621,
      label: '',
      ordered: {
        date: true,
        interval: 30000,
        max: 1408734982458,
        min: 1408734082458
      },
      series: [
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
      xAxisLabel: 'Date Histogram',
      yAxisLabel: 'Count'
    };

    beforeEach(function () {
      module('AxisTitleFactory');
    });

    beforeEach(function () {
      inject(function (d3, Private) {
        AxisTitle = Private(require('components/vislib/lib/axis_title'));
        Data = Private(require('components/vislib/lib/data'));

        el = d3.select('body').append('div')
          .attr('class', 'vis-wrapper');

        el.append('div')
          .attr('class', 'y-axis-title')
          .style('height', '20px')
          .style('width', '20px');

        el.append('div')
          .attr('class', 'x-axis-title')
          .style('height', '20px')
          .style('width', '20px');


        dataObj = new Data(data, {});
        xTitle = dataObj.get('xAxisLabel');
        yTitle = dataObj.get('yAxisLabel');
        axisTitle = new AxisTitle($('.vis-wrapper')[0], xTitle, yTitle);
      });
    });

    afterEach(function () {
      el.remove();
    });

    describe('render Method', function () {
      beforeEach(function () {
        axisTitle.render();
      });

      it('should append an svg to div', function () {
        expect(el.select('.x-axis-title').selectAll('svg').length).to.be(1);
        expect(el.select('.y-axis-title').selectAll('svg').length).to.be(1);
      });

      it('should append a g element to the svg', function () {
        expect(el.select('.x-axis-title').selectAll('svg').select('g').length).to.be(1);
        expect(el.select('.y-axis-title').selectAll('svg').select('g').length).to.be(1);
      });

      it('should append text', function () {
        expect(!!el.select('.x-axis-title').selectAll('svg').selectAll('text')).to.be(true);
        expect(!!el.select('.y-axis-title').selectAll('svg').selectAll('text')).to.be(true);
      });
    });

    describe('draw Method', function () {
      it('should be a function', function () {
        expect(_.isFunction(axisTitle.draw())).to.be(true);
      });
    });

  });
});
