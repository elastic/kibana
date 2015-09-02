var d3 = require('d3');
var angular = require('angular');
var expect = require('expect.js');
var sinon = require('sinon');
var moment = require('moment');
var _ = require('lodash');

describe('Vislib Marker Renderer Test Suite', function () {
  var markerRenderer = require('ui/vislib/lib/marker_renderer');
  var renderer;
  var partial = {
    'class': 'partially-customized-marker',
    opacity: 0.67
  };
  var full = {
    'class': 'fully-customized-marker',
    color: 'blue',
    opacity: 0.45,
    width: 3
  };

  describe('module', function () {
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
      expect(_.keys(renderer.opts)).to.have.length(4);
      expect(renderer.opts).to.eql(markerRenderer.opts);
    });

    it('should return partially configured renderer', function () {
      renderer = markerRenderer.configure(partial);
      expect(_.keys(renderer.opts)).to.have.length(4);
      expect(renderer.opts).to.eql({
        'class': 'partially-customized-marker',
        color: '#aaa',
        opacity: 0.67,
        width: 1
      });
    });

    it('should return fully configured renderer', function () {
      renderer = markerRenderer.configure(full);
      expect(_.keys(renderer.opts)).to.have.length(4);
      expect(renderer.opts).to.eql(full);
    });

    it('should inherit properties from base renderer', function () {
      renderer = markerRenderer.configure(partial);
      renderer = renderer.configure({
        'class': 'inherit-customized-marker'
      });
      expect(_.keys(renderer.opts)).to.have.length(4);
      expect(renderer.opts).to.eql({
        'class': 'inherit-customized-marker',
        color: '#aaa',
        opacity: 0.67,
        width: 1
      });

      renderer = renderer.configure({
        color: 'orange',
        opacity: 0.4567
      });
      expect(_.keys(renderer.opts)).to.have.length(4);
      expect(renderer.opts).to.eql({
        'class': 'inherit-customized-marker',
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

      var domain = [+moment().subtract(30, 'm'), +moment().add(30, 'm')]
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

      var markers = $('line.default-time-marker').get();
      expect(markers.length).to.be(1);

      var marker = markers[0];
      expect(marker.getAttribute('x1')).to.be('300');
      expect(marker.getAttribute('x2')).to.be('300');
    });

    it('should render specified times (UNIX timestamp)', function () {
      var times = [+moment().subtract(10, 'm'), +moment().add(5, 'm'), +moment().add(25, 'm')];
      markerRenderer.render(selection, xScale, HEIGHT, times);

      var markers = $('line.default-time-marker').get();
      expect(markers.length).to.be(3);

      var pairs = _.map(markers, function (marker) {
        return [marker.getAttribute('x1'), marker.getAttribute('x2')];
      });
      expect(_.sortBy(_.flatten(pairs))).to.eql([200, 200, 350, 350, 550, 550]);
    });

    it('should render specified times (d3 data series)', function () {
      var times = [{
        time: +moment().subtract(5, 'm'),
        color: 'red',
        opacity: 1.0
      }, {
        time: +moment().add(5, 'm'),
        color: 'green',
        opacity: 0.75
      }, {
        time: +moment().add(15, 'm'),
        color: 'blue',
        width: 1
      }].map(function (data) {
        return _.assign({}, {
          class: 'd3-time-marker',
          opacity: 0.5,
          width: 2
        }, data);
      });
      markerRenderer.render(selection, xScale, HEIGHT, times);

      var markers = _.sortBy($('line.d3-time-marker').get(), 'time');
      expect(markers.length).to.be(3);

      var colors = _.map(markers, function (marker) {
        return marker.getAttribute('stroke');
      });
      expect(colors).to.eql(['red', 'green', 'blue']);

      var opacities = _.map(markers, function (marker) {
        return marker.getAttribute('stroke-opacity');
      });
      expect(opacities).to.eql(['1', '0.75', '0.5']);

      var widths = _.map(markers, function (marker) {
        return marker.getAttribute('stroke-width');
      });
      expect(widths).to.eql(['2', '2', '1']);

      var pairs = _.map(markers, function (marker) {
        return [marker.getAttribute('x1'), marker.getAttribute('x2')];
      });
      expect(_.sortBy(_.flatten(pairs))).to.eql([250, 250, 350, 350, 450, 450]);
    });

    // it('should give priority to the data series', function () {
    // });
  });
});
