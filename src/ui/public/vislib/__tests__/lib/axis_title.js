import d3 from 'd3';
import angular from 'angular';
import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import $ from 'jquery';
import VislibLibAxisTitleProvider from 'ui/vislib/lib/axis_title';
import VislibLibDataProvider from 'ui/vislib/lib/data';
import PersistedStatePersistedStateProvider from 'ui/persisted_state/persisted_state';

describe('Vislib AxisTitle Class Test Suite', function () {
  let AxisTitle;
  let Data;
  let PersistedState;
  let axisTitle;
  let el;
  let dataObj;
  let xTitle;
  let yTitle;
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
    xAxisLabel: 'Date Histogram',
    yAxisLabel: 'Count'
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    AxisTitle = Private(VislibLibAxisTitleProvider);
    Data = Private(VislibLibDataProvider);
    PersistedState = Private(PersistedStatePersistedStateProvider);

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


    dataObj = new Data(data, {}, new PersistedState());
    xTitle = dataObj.get('xAxisLabel');
    yTitle = dataObj.get('yAxisLabel');
    axisTitle = new AxisTitle($('.vis-wrapper')[0], xTitle, yTitle);
  }));

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
