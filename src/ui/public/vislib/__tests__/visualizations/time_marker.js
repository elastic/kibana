var d3 = require('d3');
var angular = require('angular');
var expect = require('expect.js');
var ngMock = require('ngMock');
var _ = require('lodash');
var $ = require('jquery');
var fixtures = require('fixtures/fake_hierarchical_data');
var series = require('fixtures/vislib/mock_data/date_histogram/_series');
var terms = require('fixtures/vislib/mock_data/terms/_columns');

describe('Vislib Time Marker Test Suite', function () {
  var height = 50;
  var color = '#ff0000';
  var opacity = 0.5;
  var width = 3;
  var customClass = 'custom-time-marker';
  var dateMathTimes = ['now-1m', 'now-5m', 'now-15m'];
  var myTimes = dateMathTimes.map(function (dateMathString) {
    return {
      time: dateMathString,
      class: customClass,
      color: color,
      opacity: opacity,
      width: width
    };
  });
  var getExtent = function (dataArray, func) {
    return func(dataArray, function (obj) {
      return func(obj.values, function (d) {
        return d.x;
      });
    });
  };
  var times = [];
  var TimeMarker;
  var defaultMarker;
  var customMarker;
  var selection;
  var xScale;
  var minDomain;
  var maxDomain;
  var domain;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    TimeMarker = Private(require('ui/vislib/visualizations/time_marker'));
    minDomain = getExtent(series.series, d3.min);
    maxDomain = getExtent(series.series, d3.max);
    domain = [minDomain, maxDomain];
    xScale = d3.time.scale().domain(domain).range([0, 500]);
    defaultMarker = new TimeMarker(times, xScale, height);
    customMarker = new TimeMarker(myTimes, xScale, height);

    selection = d3.select('body').append('div').attr('class', 'marker');
    selection.datum(series);
  }));

  afterEach(function () {
    selection.remove('*');
    selection = null;
    defaultMarker = null;
  });

  describe('_isTimeBaseChart method', function () {
    var boolean;
    var newSelection;

    it('should return true when data is time based', function () {
      boolean = defaultMarker._isTimeBasedChart(selection);
      expect(boolean).to.be(true);
    });

    it('should return false when data is not time based', function () {
      newSelection = selection.datum(terms);
      boolean = defaultMarker._isTimeBasedChart(newSelection);
      expect(boolean).to.be(false);
    });
  });

  describe('render method', function () {
    var lineArray;

    beforeEach(function () {
      defaultMarker.render(selection);
      customMarker.render(selection);
      lineArray = document.getElementsByClassName('custom-time-marker');
    });

    it('should render the default line', function () {
      expect(!!$('line.time-marker').length).to.be(true);
    });

    it('should render the custom (user defined) lines', function () {
      expect($('line.custom-time-marker').length).to.be(myTimes.length);
    });

    it('should set the class', function () {
      Array.prototype.forEach.call(lineArray, function (line) {
        expect(line.getAttribute('class')).to.be(customClass);
      });
    });

    it('should set the stroke', function () {
      Array.prototype.forEach.call(lineArray, function (line) {
        expect(line.getAttribute('stroke')).to.be(color);
      });
    });

    it('should set the stroke-opacity', function () {
      Array.prototype.forEach.call(lineArray, function (line) {
        expect(+line.getAttribute('stroke-opacity')).to.be(opacity);
      });
    });

    it('should set the stroke-width', function () {
      Array.prototype.forEach.call(lineArray, function (line) {
        expect(+line.getAttribute('stroke-width')).to.be(width);
      });
    });
  });

});
