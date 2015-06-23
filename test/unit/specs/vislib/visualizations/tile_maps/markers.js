define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');
  var L = require('leaflet');
  var sinon = require('test_utils/auto_release_sinon');
  var geoJsonData = require('vislib_fixtures/mock_data/geohash/_geo_json');
  // defaults to roughly the lower 48 US states
  var defaultSWCoords = [13.496, -143.789];
  var defaultNECoords = [55.526, -57.919];
  var bounds = {};
  var MarkerType;
  var map;

  angular.module('MarkerFactory', ['kibana']);

  function setBounds(southWest, northEast) {
    bounds.southWest = L.latLng(southWest || defaultSWCoords);
    bounds.northEast = L.latLng(northEast || defaultNECoords);
  }

  function getBounds() {
    return L.latLngBounds(bounds.southWest, bounds.northEast);
  }

  var mockMap = {
    addLayer: _.noop,
    closePopup: _.noop,
    getBounds: getBounds,
    removeControl: _.noop,
    removeLayer: _.noop,
  };

  describe('Marker Class Tests', function () {
    var mapData;
    var markerLayer;

    function createMarker(MarkerClass) {
      mapData = _.assign({}, geoJsonData.geoJson);
      mapData.properties.allmin = mapData.properties.min;
      mapData.properties.allmax = mapData.properties.max;

      return new MarkerClass(mockMap, mapData, {
        valueFormatter: geoJsonData.valueFormatter
      });
    }

    beforeEach(function () {
      setBounds();
    });

    afterEach(function () {
      if (markerLayer) {
        markerLayer.destroy();
        markerLayer = undefined;
      }
    });

    describe('Base Methods', function () {
      beforeEach(function () {
        module('MarkerFactory');
        inject(function (Private) {
          var MarkerClass = Private(require('components/vislib/visualizations/marker_types/base_marker'));
          markerLayer = createMarker(MarkerClass);
        });
      });

      describe('filterToMapBounds', function () {
        it('should not filter any features', function () {
          // set bounds to the entire world
          setBounds([-87.252, -343.828], [87.252, 343.125]);
          var boundFilter = markerLayer._filterToMapBounds();
          var mapFeature = mapData.features.filter(boundFilter);

          expect(mapFeature.length).to.equal(mapData.features.length);
        });

        it('should filter out data points that are outside of the map bounds', function () {
          // set bounds to roughly US southwest
          setBounds([31.690, -124.387], [42.324, -102.919]);
          var boundFilter = markerLayer._filterToMapBounds();
          var mapFeature = mapData.features.filter(boundFilter);

          expect(mapFeature.length).to.be.lessThan(mapData.features.length);
        });
      });

      describe('legendQuantizer', function () {
        it('should return a range of hex colors', function () {
          var minColor = markerLayer._legendQuantizer(mapData.properties.allmin);
          var maxColor = markerLayer._legendQuantizer(mapData.properties.allmax);

          expect(minColor.substring(0, 1)).to.equal('#');
          expect(minColor).to.have.length(7);
          expect(maxColor.substring(0, 1)).to.equal('#');
          expect(maxColor).to.have.length(7);
          expect(minColor).to.not.eql(maxColor);
        });
      });

      describe('applyShadingStyle', function () {
        it('should return a style object', function () {
          var style = markerLayer.applyShadingStyle(100);
          expect(style).to.be.an('object');

          var keys = _.keys(style);
          var expected = ['fillColor', 'color'];
          _.each(expected, function (key) {
            expect(keys).to.contain(key);
          });
        });

        it('should use the legendQuantizer', function () {
          var spy = sinon.spy(markerLayer, '_legendQuantizer');
          var style = markerLayer.applyShadingStyle(100);
          expect(spy.callCount).to.equal(1);
        });
      });

      describe('showTooltip', function () {
        it('should use the tooltip formatter', function () {
          var content;
          var sample = _.sample(mapData.features);

          var stub = sinon.stub(markerLayer, '_tooltipFormatter', function (val) {
            return;
          });

          markerLayer._showTooltip(sample);

          expect(stub.callCount).to.equal(1);
          expect(stub.firstCall.calledWith(sample)).to.be(true);
        });
      });

      describe('addLegend', function () {
        var addToSpy;
        var leafletControlStub;

        beforeEach(function () {
          addToSpy = sinon.spy();
          leafletControlStub = sinon.stub(L, 'control', function (options) {
            return {
              addTo: addToSpy
            };
          });
        });

        it('should do nothing if there is already a legend', function () {
          markerLayer._legend = { legend: 'exists' }; // anything truthy

          markerLayer.addLegend();
          expect(leafletControlStub.callCount).to.equal(0);
        });

        it('should create a leaflet control', function () {
          markerLayer.addLegend();
          expect(leafletControlStub.callCount).to.equal(1);
          expect(addToSpy.callCount).to.equal(1);
          expect(addToSpy.firstCall.calledWith(markerLayer.map)).to.be(true);
          expect(markerLayer._legend).to.have.property('onAdd');
        });

        it('should use the value formatter', function () {
          var formatterSpy = sinon.spy(markerLayer, '_valueFormatter');
          // called twice for every legend color defined
          var expectedCallCount = markerLayer._legendColors.length * 2;

          markerLayer.addLegend();
          var legend = markerLayer._legend.onAdd();

          expect(formatterSpy.callCount).to.equal(expectedCallCount);
          expect(legend).to.be.a(HTMLDivElement);
        });
      });
    });

    describe('Shaded Circles', function () {
      beforeEach(function () {
        module('MarkerFactory');
        inject(function (Private) {
          var MarkerClass = Private(require('components/vislib/visualizations/marker_types/shaded_circles'));
          markerLayer = createMarker(MarkerClass);
        });
      });

      describe('geohashMinDistance method', function () {
        it('should return a finite number', function () {
          var sample = _.sample(mapData.features);
          var distance = markerLayer._geohashMinDistance(sample);

          expect(distance).to.be.a('number');
          expect(_.isFinite(distance)).to.be(true);
        });
      });
    });

  });
});
