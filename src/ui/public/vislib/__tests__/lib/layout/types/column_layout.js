var d3 = require('d3');
var angular = require('angular');
var _ = require('lodash');
var ngMock = require('ngMock');
var expect = require('expect.js');

describe('Vislib Column Layout Test Suite', function () {
  var layoutType;
  var columnLayout;
  var el;
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

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    layoutType = Private(require('ui/vislib/lib/layout/layout_types'));
    el = d3.select('body').append('div').attr('class', 'visualization');
    columnLayout = layoutType.histogram(el, data);
  }));

  afterEach(function () {
    el.remove();
  });

  it('should return an array of objects', function () {
    expect(_.isArray(columnLayout)).to.be(true);
    expect(_.isObject(columnLayout[0])).to.be(true);
  });

  it('should throw an error when the wrong number or no arguments provided', function () {
    expect(function () { layoutType.histogram(el); }).to.throwError();
  });
});
