import d3 from 'd3';
import angular from 'angular';
import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import $ from 'jquery';
import VislibLibDataProvider from 'ui/vislib/lib/data';
import PersistedStatePersistedStateProvider from 'ui/persisted_state/persisted_state';
import VislibLibAxisProvider from 'ui/vislib/lib/axis';

describe('Vislib xAxis Class Test Suite', function () {
  let Axis;
  let Data;
  let persistedState;
  let xAxis;
  let el;
  let fixture;
  let dataObj;
  const data = {
    hits: 621,
    ordered: {
      date: true,
      interval: 30000,
      max: 1408734982458,
      min: 1408734082458
    },
    series: [
      {
        label: 'Count',
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
    xAxisFormatter: function (thing) {
      return new Date(thing);
    },
    xAxisLabel: 'Date Histogram',
    yAxisLabel: 'Count'
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Data = Private(VislibLibDataProvider);
    persistedState = new (Private(PersistedStatePersistedStateProvider))();
    Axis = Private(VislibLibAxisProvider);

    el = d3.select('body').append('div')
      .attr('class', 'x-axis-wrapper')
      .style('height', '40px');

    fixture = el.append('div')
      .attr('class', 'x-axis-div');

    dataObj = new Data(data, {}, persistedState);
    xAxis = new Axis({
      type: 'category',
      vis: {
        el: $('.x-axis-div')[0],
        _attr: {
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          type: 'histogram'
        }
      },
      data: dataObj,
      labels: {
        xAxisFormatter: dataObj.get('xAxisFormatter')
      }
    });
  }));

  afterEach(function () {
    fixture.remove();
    el.remove();
  });

  describe('render Method', function () {
    beforeEach(function () {
      xAxis.render();
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

  describe('getScale, getDomain, getTimeDomain, and getRange Methods', function () {
    let ordered;
    let timeScale;
    let timeDomain;
    let ordinalScale;
    let ordinalDomain;
    let width;
    let range;

    beforeEach(function () {
      width = $('.x-axis-div').width();
      xAxis.getAxis(width);
      timeScale = xAxis.getScale();
      timeDomain = xAxis.axisScale.getExtents();
      range = xAxis.axisScale.getRange(width);
    });

    it('should return a function', function () {
      expect(_.isFunction(timeScale)).to.be(true);
    });

    it('should return the correct domain', function () {
      expect(_.isDate(timeScale.domain()[0])).to.be(true);
      expect(_.isDate(timeScale.domain()[1])).to.be(true);
    });

    it('should return the min and max dates', function () {
      expect(timeScale.domain()[0].toDateString()).to.be(new Date(1408734060000).toDateString());
      expect(timeScale.domain()[1].toDateString()).to.be(new Date(1408734330000).toDateString());
    });

    it('should return the correct range', function () {
      expect(range[0]).to.be(0);
      expect(range[1]).to.be(width);
    });
  });

  describe('getOrdinalDomain Method', function () {
    let ordinalScale;
    let ordinalDomain;
    let width;

    beforeEach(function () {
      width = $('.x-axis-div').width();
      xAxis.ordered = null;
      xAxis.config.ordered = null;
      xAxis.getAxis(width);
      ordinalScale = xAxis.getScale();
      ordinalDomain = ordinalScale.domain(['this', 'should', 'be', 'an', 'array']);
    });

    it('should return an ordinal scale', function () {
      expect(ordinalDomain.domain()[0]).to.be('this');
      expect(ordinalDomain.domain()[4]).to.be('array');
    });

    it('should return an array of values', function () {
      expect(_.isArray(ordinalDomain.domain())).to.be(true);
    });
  });

  describe('getXScale Method', function () {
    let width;
    let xScale;

    beforeEach(function () {
      width = $('.x-axis-div').width();
      xAxis.getAxis(width);
      xScale = xAxis.getScale();
    });

    it('should return a function', function () {
      expect(_.isFunction(xScale)).to.be(true);
    });

    it('should return a domain', function () {
      expect(_.isDate(xScale.domain()[0])).to.be(true);
      expect(_.isDate(xScale.domain()[1])).to.be(true);
    });

    it('should return a range', function () {
      expect(xScale.range()[0]).to.be(0);
      expect(xScale.range()[1]).to.be(width);
    });
  });

  describe('getXAxis Method', function () {
    let width;
    let axis;

    beforeEach(function () {
      width = $('.x-axis-div').width();
      xAxis.getAxis(width);
    });

    it('should create an getScale function on the xAxis class', function () {
      expect(_.isFunction(xAxis.getScale())).to.be(true);
    });
  });

  describe('draw Method', function () {
    it('should be a function', function () {
      expect(_.isFunction(xAxis.draw())).to.be(true);
    });
  });

});
