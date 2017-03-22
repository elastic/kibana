
import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import _ from 'lodash';
import L from 'leaflet';
import sinon from 'auto-release-sinon';
import geoJsonData from 'fixtures/vislib/mock_data/geohash/_geo_json';
import VislibVisualizationsMarkerTypesBaseMarkerProvider from 'ui/vis_maps/visualizations/marker_types/base_marker';
import VislibVisualizationsMarkerTypesShadedCirclesProvider from 'ui/vis_maps/visualizations/marker_types/shaded_circles';
import VislibVisualizationsMarkerTypesScaledCirclesProvider from 'ui/vis_maps/visualizations/marker_types/scaled_circles';
import VislibVisualizationsMarkerTypesHeatmapProvider from 'ui/vis_maps/visualizations/marker_types/heatmap';
// defaults to roughly the lower 48 US states
const defaultSWCoords = [13.496, -143.789];
const defaultNECoords = [55.526, -57.919];
const bounds = {};

angular.module('MarkerFactory', ['kibana']);

function setBounds(southWest, northEast) {
  bounds.southWest = L.latLng(southWest || defaultSWCoords);
  bounds.northEast = L.latLng(northEast || defaultNECoords);
}

function getBounds() {
  return L.latLngBounds(bounds.southWest, bounds.northEast);
}

const mockMap = {
  addLayer: _.noop,
  closePopup: _.noop,
  getBounds: getBounds,
  removeControl: _.noop,
  removeLayer: _.noop,
  getZoom: _.constant(5)
};

describe('tilemaptest - Marker Tests', function () {
  let mapData;
  let markerLayer;

  function createMarker(MarkerClass, geoJson, tooltipFormatter) {
    mapData = _.assign({}, geoJsonData.geoJson, geoJson || {});
    mapData.properties.allmin = mapData.properties.min;
    mapData.properties.allmax = mapData.properties.max;

    return new MarkerClass(mockMap, mapData, {
      valueFormatter: geoJsonData.valueFormatter,
      tooltipFormatter: tooltipFormatter || null
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
        const boundFilter = markerLayer._filterToMapBounds();
        const mapFeature = mapData.features.filter(boundFilter);

        expect(mapFeature.length).to.equal(mapData.features.length);
      });

      it('should filter out data points that are outside of the map bounds', function () {
        // set bounds to roughly US southwest
        setBounds([31.690, -124.387], [42.324, -102.919]);
        const boundFilter = markerLayer._filterToMapBounds();
        const mapFeature = mapData.features.filter(boundFilter);

        expect(mapFeature.length).to.be.lessThan(mapData.features.length);
      });
    });

    describe('legendQuantizer', function () {
      it('should return a range of hex colors', function () {
        const minColor = markerLayer._legendQuantizer(mapData.properties.allmin);
        const maxColor = markerLayer._legendQuantizer(mapData.properties.allmax);

        expect(minColor.substring(0, 1)).to.equal('#');
        expect(minColor).to.have.length(7);
        expect(maxColor.substring(0, 1)).to.equal('#');
        expect(maxColor).to.have.length(7);
        expect(minColor).to.not.eql(maxColor);
      });

      it('should return a color with 1 color', function () {
        const geoJson = { properties: { min: 1, max: 1 } };
        markerLayer = createMarker(MarkerClass, geoJson);

        // ensure the quantizer domain is correct
        const color = markerLayer._legendQuantizer(1);
        expect(color).to.not.be(undefined);
        expect(color.substring(0, 1)).to.equal('#');

        // should always get the same color back
        _.times(5, function () {
          const num = _.random(0, 100);
          const randColor = markerLayer._legendQuantizer(0);
          expect(randColor).to.equal(color);
        });
      });
    });

    describe('applyShadingStyle', function () {
      it('should return a style object', function () {
        const style = markerLayer.applyShadingStyle(100);
        expect(style).to.be.an('object');

        const keys = _.keys(style);
        const expected = ['fillColor', 'color'];
        _.each(expected, function (key) {
          expect(keys).to.contain(key);
        });
      });

      it('should use the legendQuantizer', function () {
        const spy = sinon.spy(markerLayer, '_legendQuantizer');
        const style = markerLayer.applyShadingStyle(100);
        expect(spy.callCount).to.equal(1);
      });
    });

    describe('showTooltip', function () {
      it('should use the tooltip formatter', function () {
        const sample = _.sample(mapData.features);

        markerLayer = createMarker(MarkerClass, null, Function.prototype);//create marker with tooltip
        markerLayer._attr.addTooltip = true;
        const stub = sinon.stub(markerLayer, '_tooltipFormatter', function () {
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
        leafletControlStub = sinon.stub(L, 'control', function () {
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
        const formatterSpy = sinon.spy(markerLayer, '_valueFormatter');
        // called twice for every legend color defined
        const expectedCallCount = markerLayer._legendColors.length * 2;

        markerLayer.addLegend();
        const legend = markerLayer._legend.onAdd();

        expect(formatterSpy.callCount).to.equal(expectedCallCount);
        expect(legend).to.be.a(HTMLDivElement);
      });
    });
  });

  describe('Shaded Circles', function () {
    beforeEach(ngMock.module('MarkerFactory'));
    beforeEach(ngMock.inject(function (Private) {
      const MarkerClass = Private(VislibVisualizationsMarkerTypesShadedCirclesProvider);
      markerLayer = createMarker(MarkerClass);
    }));

    describe('geohashMinDistance method', function () {
      it('should return a finite number', function () {
        const sample = _.sample(mapData.features);
        const distance = markerLayer._geohashMinDistance(sample);

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
      const MarkerClass = Private(VislibVisualizationsMarkerTypesScaledCirclesProvider);
      markerLayer = createMarker(MarkerClass);
    }));

    describe('radiusScale method', function () {
      const valueArray = [10, 20, 30, 40, 50, 60];
      const max = _.max(valueArray);
      const prev = -1;

      it('should return 0 for value of 0', function () {
        expect(markerLayer._radiusScale(0)).to.equal(0);
      });

      it('should return a scaled value for negative and positive numbers', function () {
        const upperBound = markerLayer._radiusScale(max);
        const results = [];

        function roundValue(value) {
          // round number to 6 decimal places
          const r = Math.pow(10, 6);
          return Math.round(value * r) / r;
        }

        _.each(valueArray, function (value, i) {
          const ratio = Math.pow(value / max, 0.5);
          const comparison = ratio * upperBound;
          const radius = markerLayer._radiusScale(value);
          const negRadius = markerLayer._radiusScale(value * -1);
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
      const MarkerClass = Private(VislibVisualizationsMarkerTypesHeatmapProvider);
      markerLayer = createMarker(MarkerClass);
    }));

    describe('dataToHeatArray', function () {
      let max;

      beforeEach(function () {
        max = mapData.properties.allmax;
      });

      it('should return an array or values for each feature', function () {
        const arr = markerLayer._dataToHeatArray(max);
        expect(arr).to.be.an('array');
        expect(arr).to.have.length(mapData.features.length);

      });

      it('should return an array item with lat, lng, metric for each feature', function () {
        _.times(3, function () {
          const arr = markerLayer._dataToHeatArray(max);
          const index = _.random(mapData.features.length - 1);
          const feature = mapData.features[index];
          const featureValue = feature.properties.value;
          const featureArr = feature.geometry.coordinates.slice(0).concat(featureValue);
          expect(arr[index]).to.eql(featureArr);
        });
      });

      it('should return an array item with lat, lng, normalized metric for each feature', function () {
        _.times(5, function () {
          markerLayer._attr.heatNormalizeData = true;

          const arr = markerLayer._dataToHeatArray(max);
          const index = _.random(mapData.features.length - 1);
          const feature = mapData.features[index];
          const featureValue = feature.properties.value / max;
          const featureArr = feature.geometry.coordinates.slice(0).concat(featureValue);
          expect(arr[index]).to.eql(featureArr);
        });
      });
    });

    describe('tooltipProximity', function () {
      it('should return true if feature is close enough to event latlng', function () {
        _.times(5, function () {
          const feature = _.sample(mapData.features);
          const point = markerLayer._getLatLng(feature);
          const arr = markerLayer._tooltipProximity(point, feature);
          expect(arr).to.be(true);
        });
      });

      it('should return false if feature is not close enough to event latlng', function () {
        _.times(5, function () {
          const feature = _.sample(mapData.features);
          const point = L.latLng(90, -180);
          const arr = markerLayer._tooltipProximity(point, feature);
          expect(arr).to.be(false);
        });
      });
    });

    describe('nearestFeature', function () {
      it('should return nearest geoJson feature object', function () {
        _.times(5, function () {
          const feature = _.sample(mapData.features);
          const point = markerLayer._getLatLng(feature);
          const nearestPoint = markerLayer._nearestFeature(point);
          expect(nearestPoint).to.equal(feature);
        });
      });
    });

    describe('getLatLng', function () {
      it('should return a leaflet latLng object', function () {
        const feature = _.sample(mapData.features);
        const latLng = markerLayer._getLatLng(feature);
        const compare = L.latLng(feature.geometry.coordinates.slice(0).reverse());
        expect(latLng).to.eql(compare);
      });

      it('should memoize the result', function () {
        const spy = sinon.spy(L, 'latLng');
        const feature = _.sample(mapData.features);

        markerLayer._getLatLng(feature);
        expect(spy.callCount).to.be(1);

        markerLayer._getLatLng(feature);
        expect(spy.callCount).to.be(1);
      });
    });
  });

});
