define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');
  var L = require('leaflet');

  var sinon = require('test_utils/auto_release_sinon');
  var geoJsonData = require('vislib_fixtures/mock_data/geohash/_geo_json');

  angular.module('MapFactory', ['kibana']);

  describe('TileMap Map', function () {
    var $mockMapEl = $('<div>');
    var Map;
    var map;
    var leafletMock = {};

    beforeEach(function () {
      module('MapFactory');
      inject(function (Private) {
        Map = Private(require('components/vislib/visualizations/_map'));

        leafletMock.map = {
          on: sinon.stub()
        };
      });

    });

    describe('instantiation', function () {
      var createStub;

      beforeEach(function () {
        createStub = sinon.stub(Map.prototype, '_createMap', _.noop);
        map = new Map($mockMapEl, geoJsonData, {});
      });

      it('should create the map', function () {
        expect(createStub.callCount).to.equal(1);
      });
    });

    describe('createMap', function () {
      var stubs;
      var mapStubs;

      beforeEach(function () {
        stubs = {
          layer: sinon.stub(L, 'tileLayer'),
          map: sinon.stub(L, 'map', _.constant(leafletMock.map)),
        };

        mapStubs = {
          destroy: sinon.stub(Map.prototype, 'destroy'),
          attachEvents: sinon.stub(Map.prototype, '_attachEvents'),
          addMarkers: sinon.stub(Map.prototype, '_addMarkers'),
        };

        map = new Map($mockMapEl, geoJsonData, {});
      });

      it('should create the create leaflet objects', function () {
        expect(stubs.layer.callCount).to.equal(1);
        expect(stubs.map.callCount).to.equal(1);

        var callArgs = stubs.map.firstCall.args;
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
  });
});
