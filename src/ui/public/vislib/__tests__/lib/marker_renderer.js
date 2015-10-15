var d3 = require('d3');
var angular = require('angular');
var expect = require('expect.js');
var sinon = require('sinon');
var moment = require('moment');
var _ = require('lodash');
var $ = require('jquery');

describe('Vislib Marker Renderer Test Suite', function () {
  var markerRenderer = require('ui/vislib/lib/marker_renderer');
  var renderer;
  var markers;
  var partial = {
    'class': 'partially-customized-marker',
    opacity: 0.67
  };
  var full = {
    'class': 'fully-customized-marker',
    layer: 'fully-customized-marker-layer',
    color: 'blue',
    opacity: 0.45,
    width: 3
  };

  describe('module structure', function () {
    it('should be an object that has 3 props', function () {
      expect(_.isObject(markerRenderer)).to.be(true);
      expect(_.keys(markerRenderer)).to.have.length(3);
      expect(typeof markerRenderer.render).to.be('function');
      expect(typeof markerRenderer.configure).to.be('function');
      expect(_.isObject(markerRenderer.opts)).to.be(true);
    });
  });

  describe('configure method', function () {
    it('should return default renderer', function () {
      renderer = markerRenderer.configure();
      expect(_.keys(renderer.opts)).to.have.length(5);
      expect(renderer.opts).to.eql(markerRenderer.opts);
    });

    it('should return partially configured renderer', function () {
      renderer = markerRenderer.configure(partial);
      expect(_.keys(renderer.opts)).to.have.length(5);
      expect(renderer.opts).to.eql({
        'class': 'partially-customized-marker',
        layer: 'time-marker-layer',
        color: '#aaa',
        opacity: 0.67,
        width: 1
      });
    });

    it('should return fully configured renderer', function () {
      renderer = markerRenderer.configure(full);
      expect(_.keys(renderer.opts)).to.have.length(5);
      expect(renderer.opts).to.eql(full);
    });

    it('should inherit properties from base renderer', function () {
      renderer = markerRenderer.configure(partial);
      renderer = renderer.configure({
        'class': 'inherit-customized-marker'
      });
      expect(_.keys(renderer.opts)).to.have.length(5);
      expect(renderer.opts).to.eql({
        'class': 'inherit-customized-marker',
        layer: 'time-marker-layer',
        color: '#aaa',
        opacity: 0.67,
        width: 1
      });

      renderer = renderer.configure({
        color: 'orange',
        layer: 'orange-time-marker-layer',
        opacity: 0.4567
      });
      expect(_.keys(renderer.opts)).to.have.length(5);
      expect(renderer.opts).to.eql({
        'class': 'inherit-customized-marker',
        layer: 'orange-time-marker-layer',
        color: 'orange',
        opacity: 0.4567,
        width: 1
      });
    });
  });

  describe('render method', function () {
    var HEIGHT = 50;
    var selection;
    var xScale;
    var clock;

    beforeEach(function () {
      clock = sinon.useFakeTimers();

      var domain = [+moment().subtract(30, 'm'), +moment().add(30, 'm')];
      xScale = d3.time.scale().domain(domain).range([0, 600]);

      selection = d3.select('body').append('div').attr('class', 'marker');
    });

    afterEach(function () {
      clock.restore();

      selection.remove('*');
      selection = null;
    });

    it('should render current time', function () {
      markerRenderer.render(selection, xScale, HEIGHT);

      markers = $('.time-marker-layer line.time-marker').get();
      expect(markers.length).to.be(1);

      var marker = markers[0];
      expect(marker.getAttribute('x1')).to.be('300');
      expect(marker.getAttribute('x2')).to.be('300');
    });

    it('should render specified times (UNIX timestamp)', function () {
      var times = [+moment().subtract(10, 'm'), +moment().add(5, 'm'), +moment().add(25, 'm')];
      markerRenderer.render(selection, xScale, HEIGHT, times);

      markers = $('.time-marker-layer line.time-marker').get();
      expect(markers.length).to.be(3);

      var pairs = _.map(markers, function (marker) {
        return [marker.getAttribute('x1'), marker.getAttribute('x2')];
      });
      expect(_.sortBy(_.flatten(pairs))).to.eql([200, 200, 350, 350, 550, 550]);
    });

    it('should render specified times (d3 data series)', function () {
      var times = [+moment().subtract(5, 'm'), +moment().add(5, 'm'), +moment().add(15, 'm')];
      times = times.map(function (time) {
        return { class: 'd3-time-marker', time: time };
      });
      markerRenderer.render(selection, xScale, HEIGHT, times);

      markers = _.sortBy($('.time-marker-layer line.d3-time-marker').get(), 'time');
      expect(markers.length).to.be(3);

      var pairs = _.map(markers, function (marker) {
        return [marker.getAttribute('x1'), marker.getAttribute('x2')];
      });
      expect(_.sortBy(_.flatten(pairs))).to.eql([250, 250, 350, 350, 450, 450]);
    });

    it('should overwrite base properties with d3 data series', function () {
      renderer = markerRenderer.configure({
        class: 'overwrite-time-marker',
        width: 1.5
      });

      var times = [{
        time: +moment(),
        class: 'red-time-marker',
        color: 'red'
      }, {
        time: +moment().add(10, 'm'),
        class: 'green-time-marker',
        color: 'green',
        opacity: 0.75
      }, {
        time: +moment().add(20, 'm'),
        class: 'blue-time-marker',
        color: 'blue',
        width: 1
      }];
      renderer.render(selection, xScale, HEIGHT, times);

      markers = $('.time-marker-layer line.overwrite-time-marker').get();
      expect(markers.length).to.be(0);

      markers = $('.time-marker-layer line.red-time-marker').get();
      expect(markers.length).to.be(1);

      var red = markers[0];
      expect(red.getAttribute('stroke')).to.be('red');
      expect(red.getAttribute('stroke-width')).to.be('1.5');
      expect(red.getAttribute('stroke-opacity')).to.be('0.8');

      markers = $('.time-marker-layer line.green-time-marker').get();
      expect(markers.length).to.be(1);

      var green = markers[0];
      expect(green.getAttribute('stroke')).to.be('green');
      expect(green.getAttribute('stroke-width')).to.be('1.5');
      expect(green.getAttribute('stroke-opacity')).to.be('0.75');

      markers = $('.time-marker-layer line.blue-time-marker').get();
      expect(markers.length).to.be(1);

      var blue = markers[0];
      expect(blue.getAttribute('stroke')).to.be('blue');
      expect(blue.getAttribute('stroke-width')).to.be('1');
      expect(blue.getAttribute('stroke-opacity')).to.be('0.8');
    });

    it('should render markers in separated layers', function () {
      var times = [+moment()];

      var red = markerRenderer.configure({
        layer: 'red-time-marker-layer'
      });
      red.render(selection, xScale, HEIGHT, times);

      var green = markerRenderer.configure({
        layer: 'green-time-marker-layer'
      });
      green.render(selection, xScale, HEIGHT, times);

      var blue = markerRenderer.configure({
        layer: 'blue-time-marker-layer'
      });
      blue.render(selection, xScale, HEIGHT, times);

      markers = $('line.time-marker').get();
      expect(markers.length).to.be(3);
      markers = $('.red-time-marker-layer line.time-marker').get();
      expect(markers.length).to.be(1);
      markers = $('.green-time-marker-layer line.time-marker').get();
      expect(markers.length).to.be(1);
      markers = $('.blue-time-marker-layer line.time-marker').get();
      expect(markers.length).to.be(1);
    });
  });
});
