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
  var d3;

  var markerTypes = [
    'specs/vislib/visualizations/tile_maps/_shaded_circles',
    'specs/vislib/visualizations/tile_maps/_scaled_circles',
    'specs/vislib/visualizations/tile_maps/_geohash_grid',
    'specs/vislib/visualizations/tile_maps/_heatmap',
  ];

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
    beforeEach(function () {
      setBounds();

      module('MarkerFactory');
      inject(function (Private, _d3_) {
        MarkerType = Private(require('components/vislib/visualizations/marker_types/base_marker'));
        d3 = _d3_;
      });
    });

    describe('Base Methods', function () {
      var mapData;
      var markerLayer;

      beforeEach(function () {
        mapData = _.assign({}, geoJsonData.geoJson);
        mapData.properties.allmin = mapData.properties.min;
        mapData.properties.allmax = mapData.properties.max;

        markerLayer = new MarkerType(mockMap, mapData, {
          valueFormatter: geoJsonData.valueFormatter
        });
      });

      afterEach(function () {
        markerLayer.destroy();
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

      describe('applyShadingStyle method', function () {
        it('should return an object');
      });

      describe('showTooltip method', function () {
        it('should create a .leaflet-popup-kibana div for the tooltip');
      });

    });

    // describe('Marker Types', function () {
    //   _.each(markerTypes, function (filePath) {
    //     describe(require(filePath));
    //   });
    // });
  });
});
