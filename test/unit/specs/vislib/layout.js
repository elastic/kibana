define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');

  angular.module('LayoutFactory', ['kibana']);

  describe('Vislib Layout Class Test Suite', function () {
    var Layout;
    var layout;
    var xAxisSplit;
    var el;
    var chartType = 'histogram';
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
      module('LayoutFactory');
      module('XAxisSplitFactory');
    });

    beforeEach(function () {
      inject(function (d3, Private) {
        Layout = Private(require('components/vislib/lib/layout/layout'));
        xAxisSplit = Private(require('components/vislib/lib/layout/splits/column_chart/x_axis_split'));

        el = d3.select('body').append('div')
          .attr('class', 'visualize-chart');

        layout = new Layout(el[0][0], data, chartType);
      });
    });

    afterEach(function () {
      el.remove();
    });

    describe('createLayout Method', function () {
      beforeEach(function () {
        layout.createLayout(layout.layoutType);
      });

      it('should append all the divs', function () {
        expect(el.selectAll('.vis-wrapper').length).to.be(1);
        expect(el.selectAll('.y-axis-col-wrapper').length).to.be(1);
        expect(el.selectAll('.vis-col-wrapper').length).to.be(1);
        expect(el.selectAll('.legend-col-wrapper').length).to.be(1);
        expect(el.selectAll('.k4tip').length).to.be(1);
        expect(el.selectAll('.y-axis-col').length).to.be(1);
        expect(el.selectAll('.y-axis-title').length).to.be(1);
        expect(el.selectAll('.y-axis-chart-title').length).to.be(1);
        expect(el.selectAll('.y-axis-div-wrapper').length).to.be(1);
        expect(el.selectAll('.y-axis-spacer-block').length).to.be(1);
        expect(el.selectAll('.chart-wrapper').length).to.be(1);
        expect(el.selectAll('.x-axis-wrapper').length).to.be(1);
        expect(el.selectAll('.x-axis-div-wrapper').length).to.be(1);
        expect(el.selectAll('.x-axis-chart-title').length).to.be(1);
        expect(el.selectAll('.x-axis-title').length).to.be(1);
      });
    });

    describe('layout Method', function () {
      beforeEach(function () {
        layout.layout({
          parent: layout.el,
          type: 'div',
          class: 'chart',
          datum: layout.data,
          children: [
            {
              type: 'div',
              class: 'x-axis',
              splits: xAxisSplit
            }
          ]
        });
      });

      it('should append a div with the correct class name', function () {
        expect(el.select('.chart').length).to.be(1);
      });

      it('should bind data to the DOM element', function () {
        expect(!!el.select('.chart').data()).to.be(true);
      });

      it('should create children', function () {
        expect(el.select('.x-axis').length).to.be(1);
      });

      it('should call split function when provided', function () {
        expect(el.select('.x-axis-div').length).to.be(1);
      });

      it('should throw an errors when incorrect arguments provided', function () {
        expect(function () {
          layout.layout({
            parent: null,
            type: 'div',
            class: 'chart'
          });
        }).to.throwError();

        expect(function () {
          layout.layout({
            parent: layout.el,
            type: undefined,
            class: 'chart'
          });
        }).to.throwError();

        expect(function () {
          layout.layout({
            parent: el,
            type: xAxisSplit,
            class: 'chart'
          });
        }).to.throwError();

      });
    });

    describe('appendElem Method', function () {
      beforeEach(function () {
        layout.appendElem(layout.el, 'svg', 'column');
      });

      it('should append DOM element to el with a class name', function () {
        expect(el.select('svg').attr('class')).to.be('column');
      });
    });

    describe('removeAll Method', function () {
      beforeEach(function () {
        inject(function (d3) {
          d3.select(layout.el).append('div').attr('class', 'visualize');
          layout.removeAll(layout.el);
        });
      });

      it('should remove all DOM elements from the el', function () {
        expect($(el).children().length).to.be(0);
      });
    });

  });
});
