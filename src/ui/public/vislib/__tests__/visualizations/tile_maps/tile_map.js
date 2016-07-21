var angular = require('angular');
var expect = require('expect.js');
var ngMock = require('ngMock');
var _ = require('lodash');
var $ = require('jquery');
var sinon = require('auto-release-sinon');

var geoJsonData = require('fixtures/vislib/mock_data/geohash/_geo_json');
var MockMap = require('fixtures/tilemap_map');
var mockChartEl = $('<div>');

var TileMap;
var extentsStub;

function createTileMap(handler, chartEl, chartData) {
  handler = handler || {};
  chartEl = chartEl || mockChartEl;
  chartData = chartData || geoJsonData;

  var tilemap = new TileMap(handler, chartEl, chartData);
  return tilemap;
}

describe('TileMap Tests', function () {
  var tilemap;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Private.stub(require('ui/vislib/visualizations/_map'), MockMap);
    TileMap = Private(require('ui/vislib/visualizations/tile_map'));
    extentsStub = sinon.stub(TileMap.prototype, '_appendGeoExtents', _.noop);
  }));

  beforeEach(function () {
    tilemap = createTileMap();
  });

  it('should inherit props from chartData', function () {
    _.each(geoJsonData, function (val, prop) {
      expect(tilemap).to.have.property(prop, val);
    });
  });

  it('should append geoExtents', function () {
    expect(extentsStub.callCount).to.equal(1);
  });

  describe('draw', function () {
    it('should return a function', function () {
      expect(tilemap.draw()).to.be.a('function');
    });

    it('should call destroy for clean state', function () {
      var destroySpy = sinon.spy(tilemap, 'destroy');
      tilemap.draw();
      expect(destroySpy.callCount).to.equal(1);
    });
  });

  describe('appendMap', function () {
    var $selection;

    beforeEach(function () {
      $selection = $('<div>');
      expect(tilemap.maps).to.have.length(0);
      tilemap._appendMap($selection);
    });

    it('should add the tilemap class', function () {
      expect($selection.hasClass('tilemap')).to.equal(true);
    });

    it('should append maps and required controls', function () {
      expect(tilemap.maps).to.have.length(1);
      var map = tilemap.maps[0];
      expect(map.addTitle.callCount).to.equal(0);
      expect(map.addFitControl.callCount).to.equal(1);
      expect(map.addBoundingControl.callCount).to.equal(1);
    });

    it('should only add controls if data exists', function () {
      var noData = {
        geoJson: {
          features: [],
          properties: {},
          hits: 20
        }
      };
      tilemap = createTileMap(null, null, noData);

      tilemap._appendMap($selection);
      expect(tilemap.maps).to.have.length(1);

      var map = tilemap.maps[0];
      expect(map.addTitle.callCount).to.equal(0);
      expect(map.addFitControl.callCount).to.equal(0);
      expect(map.addBoundingControl.callCount).to.equal(0);
    });

    it('should append title if set in the data object', function () {
      var mapTitle = 'Test Title';
      tilemap = createTileMap(null, null, _.assign({ title: mapTitle }, geoJsonData));
      tilemap._appendMap($selection);
      var map = tilemap.maps[0];

      expect(map.addTitle.callCount).to.equal(1);
      expect(map.addTitle.firstCall.calledWith(mapTitle)).to.equal(true);
    });
  });

  describe('destroy', function () {
    var maps = [];
    var mapCount = 5;

    beforeEach(function () {
      _.times(mapCount, function () {
        maps.push(new MockMap());
      });
      tilemap.maps = maps;
      expect(tilemap.maps).to.have.length(mapCount);
      tilemap.destroy();
    });

    it('should destroy all the maps', function () {
      expect(tilemap.maps).to.have.length(0);
      expect(maps).to.have.length(mapCount);
      _.each(maps, function (map) {
        expect(map.destroy.callCount).to.equal(1);
      });
    });
  });
});
