
import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import _ from 'lodash';
import L from 'leaflet';
import sinon from 'auto-release-sinon';
import geoJsonData from 'fixtures/vislib/mock_data/geohash/_geo_json';
import $ from 'jquery';
import VislibVisualizationsMarkerTypesBaseMarkerProvider from 'ui/vislib/visualizations/marker_types/base_marker';
import VislibVisualizationsMarkerTypesShadedCirclesProvider from 'ui/vislib/visualizations/marker_types/shaded_circles';
import VislibVisualizationsMarkerTypesScaledCirclesProvider from 'ui/vislib/visualizations/marker_types/scaled_circles';
import VislibVisualizationsMarkerTypesHeatmapProvider from 'ui/vislib/visualizations/marker_types/heatmap';
// defaults to roughly the lower 48 US states
let defaultSWCoords = [13.496, -143.789];
let defaultNECoords = [55.526, -57.919];
let bounds = {};
let MarkerType;
let map;

angular.module('MarkerFactory', ['kibana']);

function setBounds(southWest, northEast) {
  bounds.southWest = L.latLng(southWest || defaultSWCoords);
  bounds.northEast = L.latLng(northEast || defaultNECoords);
}

function getBounds() {
  return L.latLngBounds(bounds.southWest, bounds.northEast);
}

let mockMap = {
  addLayer: _.noop,
  closePopup: _.noop,
  getBounds: getBounds,
  removeControl: _.noop,
  removeLayer: _.noop,
  getZoom: _.constant(5)
};

describe('Marker Tests', function () {
  let mapData;
  let markerLayer;

  function createMarker(MarkerClass, geoJson) {
    mapData = _.assign({}, geoJsonData.geoJson, geoJson || {});
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
    let MarkerClass;

    beforeEach(ngMock.module('MarkerFactory'));
    beforeEach(ngMock.inject(function (Private) {
      MarkerClass = Private(VislibVisualizationsMarkerTypesBaseMarkerProvider);
      markerLayer = createMarker(MarkerClass);
    }));

    describe('filterToMapBounds', function () {
      it('should not filter any features', function () {
        // set bounds to the entire world
        setBounds([-87.252, -343.828], [87.252, 343.125]);
        let boundFilter = markerLayer._filterToMapBounds();
        let mapFeature = mapData.features.filter(boundFilter);

        expect(mapFeature.length).to.equal(mapData.features.length);
      });

      it('should filter out data points that are outside of the map bounds', function () {
        // set bounds to roughly US southwest
        setBounds([31.690, -124.387], [42.324, -102.919]);
        let boundFilter = markerLayer._filterToMapBounds();
        let mapFeature = mapData.features.filter(boundFilter);

        expect(mapFeature.length).to.be.lessThan(mapData.features.length);
      });
    });

    describe('legendQuantizer', function () {
      it('should return a range of hex colors', function () {
        let minColor = markerLayer._legendQuantizer(mapData.properties.allmin);
        let maxColor = markerLayer._legendQuantizer(mapData.properties.allmax);

        expect(minColor.substring(0, 1)).to.equal('#');
        expect(minColor).to.have.length(7);
        expect(maxColor.substring(0, 1)).to.equal('#');
        expect(maxColor).to.have.length(7);
        expect(minColor).to.not.eql(maxColor);
      });

      it('should return a color with 1 color', function () {
        let geoJson = { properties: { min: 1, max: 1 } };
        markerLayer = createMarker(MarkerClass, geoJson);

        // ensure the quantizer domain is correct
        let color = markerLayer._legendQuantizer(1);
        expect(color).to.not.be(undefined);
        expect(color.substring(0, 1)).to.equal('#');

        // should always get the same color back
        _.times(5, function () {
          let num = _.random(0, 100);
          let randColor = markerLayer._legendQuantizer(0);
          expect(randColor).to.equal(color);
        });
      });
    });

    describe('applyShadingStyle', function () {
      it('should return a style object', function () {
        let style = markerLayer.applyShadingStyle(100);
        expect(style).to.be.an('object');

        let keys = _.keys(style);
        let expected = ['fillColor', 'color'];
        _.each(expected, function (key) {
          expect(keys).to.contain(key);
        });
      });

      it('should use the legendQuantizer', function () {
        let spy = sinon.spy(markerLayer, '_legendQuantizer');
        let style = markerLayer.applyShadingStyle(100);
        expect(spy.callCount).to.equal(1);
      });
    });

    describe('showTooltip', function () {
      it('should use the tooltip formatter', function () {
        let content;
        let sample = _.sample(mapData.features);

        let stub = sinon.stub(markerLayer, '_tooltipFormatter', function (val) {
          return;
        });

        markerLayer._showTooltip(sample);

        expect(stub.callCount).to.equal(1);
        expect(stub.firstCall.calledWith(sample)).to.be(true);
      });
    });

    describe('addLegend', function () {
      let addToSpy;
      let leafletControlStub;

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
        let formatterSpy = sinon.spy(markerLayer, '_valueFormatter');
        // called twice for every legend color defined
        let expectedCallCount = markerLayer._legendColors.length * 2;

        markerLayer.addLegend();
        let legend = markerLayer._legend.onAdd();

        expect(formatterSpy.callCount).to.equal(expectedCallCount);
        expect(legend).to.be.a(HTMLDivElement);
      });
    });
  });

  describe('Shaded Circles', function () {
    beforeEach(ngMock.module('MarkerFactory'));
    beforeEach(ngMock.inject(function (Private) {
      let MarkerClass = Private(VislibVisualizationsMarkerTypesShadedCirclesProvider);
      markerLayer = createMarker(MarkerClass);
    }));

    describe('geohashMinDistance method', function () {
      it('should return a finite number', function () {
        let sample = _.sample(mapData.features);
        let distance = markerLayer._geohashMinDistance(sample);

        expect(distance).to.be.a('number');
        expect(_.isFinite(distance)).to.be(true);
      });
    });
  });

  describe('Scaled Circles', function () {
    let zoom;

    beforeEach(ngMock.module('MarkerFactory'));
    beforeEach(ngMock.inject(function (Private) {
      zoom = _.random(1, 18);
      sinon.stub(mockMap, 'getZoom', _.constant(zoom));
      let MarkerClass = Private(VislibVisualizationsMarkerTypesScaledCirclesProvider);
      markerLayer = createMarker(MarkerClass);
    }));

    describe('radiusScale method', function () {
      let valueArray = [10, 20, 30, 40, 50, 60];
      let max = _.max(valueArray);
      let prev = -1;

      it('should return 0 for value of 0', function () {
        expect(markerLayer._radiusScale(0)).to.equal(0);
      });

      it('should return a scaled value for negative and positive numbers', function () {
        let upperBound = markerLayer._radiusScale(max);
        let results = [];

        function roundValue(value) {
          // round number to 6 decimal places
          let r = Math.pow(10, 6);
          return Math.round(value * r) / r;
        }

        _.each(valueArray, function (value, i) {
          let ratio = Math.pow(value / max, 0.5);
          let comparison = ratio * upperBound;
          let radius = markerLayer._radiusScale(value);
          let negRadius = markerLayer._radiusScale(value * -1);
          results.push(radius);

          expect(negRadius).to.equal(radius);
          expect(roundValue(radius)).to.equal(roundValue(comparison));

          // check that the radius is getting larger
          if (i > 0) {
            expect(radius).to.be.above(results[i - 1]);
          }
        });
      });
    });
  });

  describe('Heatmaps', function () {
    beforeEach(ngMock.module('MarkerFactory'));
    beforeEach(ngMock.inject(function (Private) {
      let MarkerClass = Private(VislibVisualizationsMarkerTypesHeatmapProvider);
      markerLayer = createMarker(MarkerClass);
    }));

    describe('dataToHeatArray', function () {
      let max;

      beforeEach(function () {
        max = mapData.properties.allmax;
      });

      it('should return an array or values for each feature', function () {
        let arr = markerLayer._dataToHeatArray(max);
        expect(arr).to.be.an('array');
        expect(arr).to.have.length(mapData.features.length);

      });

      it('should return an array item with lat, lng, metric for each feature', function () {
        _.times(3, function () {
          let arr = markerLayer._dataToHeatArray(max);
          let index = _.random(mapData.features.length - 1);
          let feature = mapData.features[index];
          let featureValue = feature.properties.value;
          let featureArr = feature.geometry.coordinates.slice(0).concat(featureValue);
          expect(arr[index]).to.eql(featureArr);
        });
      });

      it('should return an array item with lat, lng, normalized metric for each feature', function () {
        _.times(5, function () {
          markerLayer._attr.heatNormalizeData = true;

          let arr = markerLayer._dataToHeatArray(max);
          let index = _.random(mapData.features.length - 1);
          let feature = mapData.features[index];
          let featureValue = feature.properties.value / max;
          let featureArr = feature.geometry.coordinates.slice(0).concat(featureValue);
          expect(arr[index]).to.eql(featureArr);
        });
      });
    });

    describe('tooltipProximity', function () {
      it('should return true if feature is close enough to event latlng', function () {
        _.times(5, function () {
          let feature = _.sample(mapData.features);
          let point = markerLayer._getLatLng(feature);
          let arr = markerLayer._tooltipProximity(point, feature);
          expect(arr).to.be(true);
        });
      });

      it('should return false if feature is not close enough to event latlng', function () {
        _.times(5, function () {
          let feature = _.sample(mapData.features);
          let point = L.latLng(90, -180);
          let arr = markerLayer._tooltipProximity(point, feature);
          expect(arr).to.be(false);
        });
      });
    });

    describe('nearestFeature', function () {
      it('should return nearest geoJson feature object', function () {
        _.times(5, function () {
          let feature = _.sample(mapData.features);
          let point = markerLayer._getLatLng(feature);
          let nearestPoint = markerLayer._nearestFeature(point);
          expect(nearestPoint).to.equal(feature);
        });
      });
    });

    describe('getLatLng', function () {
      it('should return a leaflet latLng object', function () {
        let feature = _.sample(mapData.features);
        let latLng = markerLayer._getLatLng(feature);
        let compare = L.latLng(feature.geometry.coordinates.slice(0).reverse());
        expect(latLng).to.eql(compare);
      });

      it('should memoize the result', function () {
        let spy = sinon.spy(L, 'latLng');
        let feature = _.sample(mapData.features);

        markerLayer._getLatLng(feature);
        expect(spy.callCount).to.be(1);

        markerLayer._getLatLng(feature);
        expect(spy.callCount).to.be(1);
      });
    });
  });

});
