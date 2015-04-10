define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');
  var fixtures = require('fixtures/fake_hierarchical_data');
  var series = require('vislib_fixtures/mock_data/date_histogram/_series');
  var terms = require('vislib_fixtures/mock_data/terms/_columns');

  angular.module('TimeMarkerFactory', ['kibana']);
  describe('VisLib Time Marker Test Suite', function () {
    var height = 50;
    var times = [];
    var TimeMarker;
    var marker;
    var selection;
    var xScale;

    beforeEach(function () {
      module('TimeMarkerFactory');
    });

    beforeEach(function () {
      inject(function (d3, Private) {
        TimeMarker = Private(require('components/vislib/visualizations/time_marker'));
        xScale = d3.time.scale();
        marker = new TimeMarker(times, xScale, height);

        selection = d3.select('body').append('div').attr('class', 'marker');
        selection.datum(series);
      });
    });

    afterEach(function () {
      selection.remove('*');
      selection = null;
      marker = null;
    });

    describe('_isTimeBaseChart method', function () {
      var boolean;
      var newSelection;

      it('should return true when data is time based', function () {
        boolean = marker._isTimeBasedChart(selection);
        expect(boolean).to.be(true);
      });

      it('should return false when data is not time based', function () {
        newSelection = selection.datum(terms);
        boolean = marker._isTimeBasedChart(newSelection);
        expect(boolean).to.be(false);
      });
    });

    describe('get method', function () {
      it('should get the correct value', function () {
        var ht = marker.get('height');
        var scale = marker.get('xScale');
        var currentTimeArr = marker.get('times');
        expect(ht).to.be(height);
        expect(currentTimeArr.length).to.be(1);
        expect(scale).to.be(xScale);
      });
    });

    describe('set method', function () {
      it('should set the value', function () {
        var lineClass = 'new-time-marker';
        marker.set('lineClass', lineClass);
        expect(marker.get('lineClass')).to.be(lineClass);
      });
    });

    describe('render method', function () {
      it('should render lines', function () {
        marker.render(selection);
        expect(!!$('line.time-marker').length).to.be(true);
      });
    });

  });
});