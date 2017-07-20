import d3 from 'd3';
import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import { VislibLibLayoutLayoutTypesProvider } from 'ui/vislib/lib/layout/layout_types';

describe('Vislib Column Layout Test Suite', function () {
  let layoutType;
  let columnLayout;
  let el;
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
    layoutType = Private(VislibLibLayoutLayoutTypesProvider);
    el = d3.select('body').append('div').attr('class', 'visualization');
    columnLayout = layoutType.point_series(el, data);
  }));

  afterEach(function () {
    el.remove();
  });

  it('should return an array of objects', function () {
    expect(_.isArray(columnLayout)).to.be(true);
    expect(_.isObject(columnLayout[0])).to.be(true);
  });

  it('should throw an error when the wrong number or no arguments provided', function () {
    expect(function () { layoutType.point_series(el); }).to.throwError();
  });
});
