import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import _ from 'lodash';
import L from 'leaflet';

import sinon from 'auto-release-sinon';
import geoJsonData from 'fixtures/vislib/mock_data/geohash/_geo_json';
import $ from 'jquery';
import VislibVisualizationsMapProvider from 'ui/vislib/visualizations/_map';

// // Data
// const dataArray = [
//   ['geojson', require('fixtures/vislib/mock_data/geohash/_geo_json')],
//   ['columns', require('fixtures/vislib/mock_data/geohash/_columns')],
//   ['rows', require('fixtures/vislib/mock_data/geohash/_rows')],
// ];

// TODO: Test the specific behavior of each these
// const mapTypes = [
//   'Scaled Circle Markers',
//   'Shaded Circle Markers',
//   'Shaded Geohash Grid',
//   'Heatmap'
// ];

describe('TileMap Map Tests', function () {
  const $mockMapEl = $('<div>');
  let TileMapMap;
  const leafletStubs = {};
  const leafletMocks = {};

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    // mock parts of leaflet
    leafletMocks.tileLayer = { on: sinon.stub() };
    leafletMocks.map = { on: sinon.stub() };
    leafletStubs.tileLayer = sinon.stub(L, 'tileLayer', _.constant(leafletMocks.tileLayer));
    leafletStubs.tileLayer.wms = sinon.stub(L.tileLayer, 'wms', _.constant(leafletMocks.tileLayer));

    leafletStubs.map = sinon.stub(L, 'map', _.constant(leafletMocks.map));

    TileMapMap = Private(VislibVisualizationsMapProvider);
  }));

  describe('instantiation', function () {
    let map;
    let createStub;

    beforeEach(function () {
      createStub = sinon.stub(TileMapMap.prototype, '_createMap', _.noop);
      map = new TileMapMap($mockMapEl, geoJsonData, {});
    });

    it('should create the map', function () {
      expect(createStub.callCount).to.equal(1);
    });

    it('should add zoom controls', function () {
      const mapOptions = createStub.firstCall.args[0];

      expect(mapOptions).to.be.an('object');
      if (mapOptions.zoomControl) expect(mapOptions.zoomControl).to.be.ok();
      else expect(mapOptions.zoomControl).to.be(undefined);
    });
  });

  describe('createMap', function () {
    let map;
    let mapStubs;

    beforeEach(function () {
      mapStubs = {
        destroy: sinon.stub(TileMapMap.prototype, 'destroy'),
        attachEvents: sinon.stub(TileMapMap.prototype, '_attachEvents'),
        addMarkers: sinon.stub(TileMapMap.prototype, '_addMarkers'),
      };
      map = new TileMapMap($mockMapEl, geoJsonData, {});
    });

    it('should create the create leaflet objects', function () {
      expect(leafletStubs.tileLayer.callCount).to.equal(1);
      expect(leafletStubs.map.callCount).to.equal(1);

      const callArgs = leafletStubs.map.firstCall.args;
      const mapOptions = callArgs[1];
      expect(callArgs[0]).to.be($mockMapEl.get(0));
      expect(mapOptions).to.have.property('zoom');
      expect(mapOptions).to.have.property('center');
    });

    it('should attach events and add markers', function () {
      expect(mapStubs.attachEvents.callCount).to.equal(1);
      expect(mapStubs.addMarkers.callCount).to.equal(1);
    });

    it('should call destroy only if a map exists', function () {
      expect(mapStubs.destroy.callCount).to.equal(0);
      map._createMap({});
      expect(mapStubs.destroy.callCount).to.equal(1);
    });

    it('should create a WMS layer if WMS is enabled', function () {
      expect(L.tileLayer.wms.called).to.be(false);
      map = new TileMapMap($mockMapEl, geoJsonData, {attr: {wms: {enabled: true}}});
      map._createMap({});
      expect(L.tileLayer.wms.called).to.be(true);
      L.tileLayer.restore();
    });
  });

  describe('attachEvents', function () {
    let map;

    beforeEach(function () {
      sinon.stub(TileMapMap.prototype, '_createMap', function () {
        this._tileLayer = leafletMocks.tileLayer;
        this.map = leafletMocks.map;
        this._attachEvents();
      });
      map = new TileMapMap($mockMapEl, geoJsonData, {});
    });

    it('should attach interaction events', function () {
      const expectedTileEvents = ['tileload'];
      const expectedMapEvents = ['draw:created', 'moveend', 'zoomend', 'unload'];
      const matchedEvents = {
        tiles: 0,
        maps: 0,
      };

      _.times(leafletMocks.tileLayer.on.callCount, function (index) {
        const ev = leafletMocks.tileLayer.on.getCall(index).args[0];
        if (_.includes(expectedTileEvents, ev)) matchedEvents.tiles++;
      });
      expect(matchedEvents.tiles).to.equal(expectedTileEvents.length);

      _.times(leafletMocks.map.on.callCount, function (index) {
        const ev = leafletMocks.map.on.getCall(index).args[0];
        if (_.includes(expectedMapEvents, ev)) matchedEvents.maps++;
      });
      expect(matchedEvents.maps).to.equal(expectedMapEvents.length);
    });
  });


  describe('addMarkers', function () {
    let map;
    let createStub;

    beforeEach(function () {
      sinon.stub(TileMapMap.prototype, '_createMap');
      createStub = sinon.stub(TileMapMap.prototype, '_createMarkers', _.constant({ addLegend: _.noop }));
      map = new TileMapMap($mockMapEl, geoJsonData, {});
    });

    it('should pass the map options to the marker', function () {
      map._addMarkers();

      const args = createStub.firstCall.args[0];
      expect(args).to.have.property('tooltipFormatter');
      expect(args).to.have.property('valueFormatter');
      expect(args).to.have.property('attr');
    });

    it('should destroy existing markers', function () {
      const destroyStub = sinon.stub();
      map._markers = { destroy: destroyStub };
      map._addMarkers();

      expect(destroyStub.callCount).to.be(1);
    });
  });

  describe('getDataRectangles', function () {
    let map;

    beforeEach(function () {
      sinon.stub(TileMapMap.prototype, '_createMap');
      map = new TileMapMap($mockMapEl, geoJsonData, {});
    });

    it('should return an empty array if no data', function () {
      map = new TileMapMap($mockMapEl, {}, {});
      const rects = map._getDataRectangles();
      expect(rects).to.have.length(0);
    });

    it('should return an array of arrays of rectangles', function () {
      const rects = map._getDataRectangles();
      _.times(5, function () {
        const index = _.random(rects.length - 1);
        const rect = rects[index];
        const featureRect = geoJsonData.geoJson.features[index].properties.rectangle;
        expect(rect.length).to.equal(featureRect.length);

        // should swap the array
        const checkIndex = _.random(rect.length - 1);
        expect(rect[checkIndex]).to.eql(featureRect[checkIndex]);
      });
    });
  });
});
