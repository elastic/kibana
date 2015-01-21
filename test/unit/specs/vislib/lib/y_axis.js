define(function (require) {
  var _ = require('lodash');
  var d3 = require('d3');
  var $ = require('jquery');

  var YAxis;
  var Data;
  var el;
  var yAxis;
  var yAxisDiv;

  var timeSeries = [
    1408734060000,
    1408734090000,
    1408734120000,
    1408734150000,
    1408734180000,
    1408734210000,
    1408734240000,
    1408734270000,
    1408734300000,
    1408734330000
  ];

  var defaultGraphData = [
    [ 8, 23, 30, 28, 36, 30, 26, 22, 29, 24 ],
    [ 2, 13, 20, 18, 26, 20, 16, 12, 19, 14 ]
  ];

  function makeSeriesData(data) {
    return timeSeries.map(function (timestamp, i) {
      return {
        x: timestamp,
        y: data[i] || 0
      };
    });
  }

  function createData(seriesData) {
    var data = {
      hits: 621,
      label: 'test',
      ordered: {
        date: true,
        interval: 30000,
        max: 1408734982458,
        min: 1408734082458
      },
      series: seriesData.map(function (series) {
        return { values: makeSeriesData(series) };
      }),
      xAxisLabel: 'Date Histogram',
      yAxisLabel: 'Count'
    };

    var node = $('<div>').css({
      height: 40,
      width: 40
    })
    .appendTo('body')
    .addClass('y-axis-wrapper')
    .get(0);

    el = d3.select(node).datum(data);

    yAxisDiv = el.append('div')
    .attr('class', 'y-axis-div');

    var dataObj = new Data(data, {
      defaultYMin: true
    });

    yAxis = new YAxis({
      el: node,
      yMin: dataObj.getYMinValue(),
      yMax: dataObj.getYMaxValue(),
      _attr: {
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      }
    });
  }

  describe('Vislib yAxis Class Test Suite', function () {
    var d3Provider;

    beforeEach(module('kibana'));

    beforeEach(inject(function (Private, _d3_) {
      d3Provider = _d3_;
      Data = Private(require('components/vislib/lib/data'));
      YAxis = Private(require('components/vislib/lib/y_axis'));

      expect($('.y-axis-wrapper')).to.have.length(0);
    }));

    afterEach(function () {
      el.remove();
      yAxisDiv.remove();
    });

    describe('render Method', function () {
      beforeEach(function () {
        createData(defaultGraphData);
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

    describe('formatAxisLabel method', function () {
      var num = 1e9;
      var val;

      beforeEach(function () {
        createData(defaultGraphData);
        val = yAxis.formatAxisLabel(num);
      });

      it('should return a string with suffix B', function () {
        expect(val).to.be('1b');
      });
    });

    describe('getYAxis method', function () {
      var mode, yMax, yScale;
      beforeEach(function () {
        createData(defaultGraphData);
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
      beforeEach(function () {
        createData(defaultGraphData);
      });

      it('should be a function', function () {
        expect(_.isFunction(yAxis.draw())).to.be(true);
      });
    });

    describe('tickScale Method', function () {
      beforeEach(function () {
        createData(defaultGraphData);
      });

      it('should return the correct number of ticks', function () {
        expect(yAxis.tickScale(1000)).to.be(11);
        expect(yAxis.tickScale(40)).to.be(3);
        expect(yAxis.tickScale(20)).to.be(0);
      });
    });
  });
});