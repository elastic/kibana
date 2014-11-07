define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var d3 = require('d3');
  var $ = require('jquery');

  angular.module('YAxisFactory', ['kibana']);

  describe('Vislib yAxis Class Test Suite', function () {
    var YAxis;
    var Data;
    var yAxis;
    var el;
    var yAxisDiv;
    var dataObj;
    var data = {
      hits: 621,
      label: 'test',
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
        },
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

    beforeEach(module('YAxisFactory'));
    beforeEach(inject(function (d3, Private) {
      Data = Private(require('components/vislib/lib/data'));
      YAxis = Private(require('components/vislib/lib/y_axis'));

      expect($('.y-axis-wrapper')).to.have.length(0);

      var $node = $('<div>').css({
        height: 40,
        width: 40
      })
      .appendTo('body')
      .addClass('y-axis-wrapper');

      var node = $node.get(0);

      el = d3.select(node).datum(data);

      yAxisDiv = el.append('div')
        .attr('class', 'y-axis-div');

      dataObj = new Data(data, {});
      yAxis = new YAxis({
        el: node,
        yMax: dataObj.getYMaxValue(),
        _attr: {
          margin: { top: 0, right: 0, bottom: 0, left: 0 }
        }
      });
    }));

    afterEach(function () {
      el.remove();
      yAxisDiv.remove();
    });

    describe('render Method', function () {
      beforeEach(function () {
        expect(d3.select(yAxis.el).selectAll('.y-axis-div')).to.have.length(1);
        yAxis.render();
      });

      it('should append an svg to div', function () {
        expect(el.selectAll('svg').length).to.be(1);
      });

      it('should append a g element to the svg', function () {
        expect(el.selectAll('svg').select('g').length).to.be(1);
      });

      it('should append ticks with text', function () {
        expect(!!el.selectAll('svg').selectAll('.tick text')).to.be(true);
      });
    });

    describe('getYScale Method', function () {
      var yScale;
      var height = 50;

      beforeEach(function () {
        yScale = yAxis.getYScale(height);
      });

      it('should return a function', function () {
        expect(_.isFunction(yScale)).to.be(true);
      });

      it('should return the correct domain', function () {
        expect(yScale.domain()[0]).to.be(0);
        // Should be greater than 36 since we are using .nice()
        expect(yScale.domain()[1]).to.be.greaterThan(36);
      });

      it('should return the correct range', function () {
        expect(yScale.range()[0]).to.be(height);
        // The yScale range should always start from 0
        expect(yScale.range()[1]).to.be(0);
      });
    });

    describe('getYAxis method', function () {
      var mode, yMax, yScale;
      beforeEach(function () {
        mode = yAxis._attr.mode;
        yMax = yAxis.yMax;
        yScale = yAxis.getYScale;
      });

      afterEach(function () {
        yAxis._attr.mode = mode;
        yAxis.yMax = yMax;
        yAxis.getYScale = yScale;
      });

      it('should use percentage format for percentages', function () {
        yAxis._attr.mode = 'percentage';
        var tickFormat = yAxis.getYAxis().tickFormat();
        expect(tickFormat(1)).to.be('100%');
      });

      it('should use decimal format for small values', function () {
        yAxis.yMax = 1;
        var tickFormat = yAxis.getYAxis().tickFormat();
        expect(tickFormat(0.8)).to.be('0.8');
      });

      it('should throw an error if yScale is NaN', function () {
        yAxis.getYScale = function () { return NaN; };
        expect(function () {
          yAxis.getYAxis();
        }).to.throwError();
      });
    });

    describe('draw Method', function () {
      it('should be a function', function () {
        expect(_.isFunction(yAxis.draw())).to.be(true);
      });
    });

    describe('tickScale Method', function () {
      it('should return the correct number of ticks', function () {
        expect(yAxis.tickScale(1000)).to.be(11);
        expect(yAxis.tickScale(40)).to.be(3);
        expect(yAxis.tickScale(20)).to.be(0);
      });
    });
  });
});
