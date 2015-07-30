var angular = require('angular');
var expect = require('expect.js');
var ngMock = require('ngMock');
var _ = require('lodash');
var $ = require('jquery');
var L = require('leaflet');

var sinon = require('auto-release-sinon');
var geoJsonData = require('fixtures/vislib/mock_data/geohash/_geo_json');

// // Data
// var dataArray = [
//   ['geojson', require('fixtures/vislib/mock_data/geohash/_geo_json')],
//   ['columns', require('fixtures/vislib/mock_data/geohash/_columns')],
//   ['rows', require('fixtures/vislib/mock_data/geohash/_rows')],
// ];

// // TODO: Test the specific behavior of each these
// var mapTypes = [
//   'Scaled Circle Markers',
//   'Shaded Circle Markers',
//   'Shaded Geohash Grid',
//   'Heatmap'
// ];

describe('TileMap Map Tests', function () {
  this.timeout(0);
  var $mockMapEl = $('<div>');
  var Map;
  var leafletStubs = {};
  var leafletMocks = {};

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    // mock parts of leaflet
    leafletMocks.tileLayer = { on: sinon.stub() };
    leafletMocks.map = { on: sinon.stub() };
    leafletStubs.tileLayer = sinon.stub(L, 'tileLayer', _.constant(leafletMocks.tileLayer));
    leafletStubs.map = sinon.stub(L, 'map', _.constant(leafletMocks.map));

    Map = Private(require('ui/vislib/visualizations/_map'));
  }));

  describe('instantiation', function () {
    var map;
    var createStub;

    beforeEach(function () {
      createStub = sinon.stub(Map.prototype, '_createMap', _.noop);
      map = new Map($mockMapEl, geoJsonData, {});
    });

    it('should create the map', function () {
      expect(createStub.callCount).to.equal(1);
    });

    it('should add zoom controls', function () {
      var mapOptions = createStub.firstCall.args[0];

      expect(mapOptions).to.be.an('object');
      if (mapOptions.zoomControl) expect(mapOptions.zoomControl).to.be.ok();
      else expect(mapOptions.zoomControl).to.be(undefined);
    });
  });

  describe('createMap', function () {
    var map;
    var mapStubs;

    beforeEach(function () {
      mapStubs = {
        destroy: sinon.stub(Map.prototype, 'destroy'),
        attachEvents: sinon.stub(Map.prototype, '_attachEvents'),
        addMarkers: sinon.stub(Map.prototype, '_addMarkers'),
      };

      map = new Map($mockMapEl, geoJsonData, {});
    });

    it('should create the create leaflet objects', function () {
      expect(leafletStubs.tileLayer.callCount).to.equal(1);
      expect(leafletStubs.map.callCount).to.equal(1);

      var callArgs = leafletStubs.map.firstCall.args;
      var mapOptions = callArgs[1];
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
  });

  describe('attachEvents', function () {
    var map;

    beforeEach(function () {
      sinon.stub(Map.prototype, '_createMap', function () {
        this._tileLayer = leafletMocks.tileLayer;
        this.map = leafletMocks.map;
        this._attachEvents();
      });
      map = new Map($mockMapEl, geoJsonData, {});
    });

    it('should attach interaction events', function () {
      var expectedTileEvents = ['tileload'];
      var expectedMapEvents = ['draw:created', 'moveend', 'zoomend', 'unload'];
      var matchedEvents = {
        tiles: 0,
        maps: 0,
      };

      _.times(leafletMocks.tileLayer.on.callCount, function (index) {
        var ev = leafletMocks.tileLayer.on.getCall(index).args[0];
        if (_.includes(expectedTileEvents, ev)) matchedEvents.tiles++;
      });
      expect(matchedEvents.tiles).to.equal(expectedTileEvents.length);

      _.times(leafletMocks.map.on.callCount, function (index) {
        var ev = leafletMocks.map.on.getCall(index).args[0];
        if (_.includes(expectedMapEvents, ev)) matchedEvents.maps++;
      });
      expect(matchedEvents.maps).to.equal(expectedMapEvents.length);
    });
  });


  describe('addMarkers', function () {
    var map;
    var createStub;

    beforeEach(function () {
      sinon.stub(Map.prototype, '_createMap');
      createStub = sinon.stub(Map.prototype, '_createMarkers', _.constant({ addLegend: _.noop }));
      map = new Map($mockMapEl, geoJsonData, {});
    });

    it('should pass the map options to the marker', function () {
      map._addMarkers();

      var args = createStub.firstCall.args[0];
      expect(args).to.have.property('tooltipFormatter');
      expect(args).to.have.property('valueFormatter');
      expect(args).to.have.property('attr');
    });

    it('should destroy existing markers', function () {
      var destroyStub = sinon.stub();
      map._markers = { destroy: destroyStub };
      map._addMarkers();

      expect(destroyStub.callCount).to.be(1);
    });
  });

  describe('getDataRectangles', function () {
    var map;

    beforeEach(function () {
      sinon.stub(Map.prototype, '_createMap');
      map = new Map($mockMapEl, geoJsonData, {});
    });

    it('should return an empty array if no data', function () {
      map = new Map($mockMapEl, {}, {});
      var rects = map._getDataRectangles();
      expect(rects).to.have.length(0);
    });

    it('should return an array of arrays of rectangles', function () {
      var rects = map._getDataRectangles();
      _.times(5, function () {
        var index = _.random(rects.length - 1);
        var rect = rects[index];
        var featureRect = geoJsonData.geoJson.features[index].properties.rectangle;
        expect(rect.length).to.equal(featureRect.length);

        // should swap the array
        var checkIndex = _.random(rect.length - 1);
        expect(rect[checkIndex]).to.eql(featureRect[checkIndex]);
      });
    });
  });
});
