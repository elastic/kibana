import expect from 'expect.js';
import ngMock from 'ng_mock';
import _ from 'lodash';
import sinon from 'auto-release-sinon';

import geoJsonData from 'fixtures/vislib/mock_data/geohash/_geo_json';
import MockMap from 'fixtures/tilemap_map';
import $ from 'jquery';
import VislibVisualizationsTileMapProvider from 'ui/vis_maps/visualizations/tile_map';
const mockChartEl = $('<div>');

let TileMap;
let extentsStub;

function createTileMap(handler, chartEl, chartData) {
  handler = handler || {
    visConfig: {
      get: function () {
        return '';
      }
    },
    uiState: {
      get: function () {
        return '';
      }
    }
  };
  chartEl = chartEl || mockChartEl;
  chartData = chartData || geoJsonData;

  const tilemap = new TileMap(handler, chartEl, chartData);
  return tilemap;
}

describe('tilemaptest - TileMap Tests', function () {
  let tilemap;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Private.stub(require('ui/vis_maps/visualizations/_map'), MockMap);
    TileMap = Private(VislibVisualizationsTileMapProvider);
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
  });

  describe('appendMap', function () {
    let $selection;

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
      const map = tilemap.maps[0];
      expect(map.addTitle.callCount).to.equal(0);
      expect(map.addFitControl.callCount).to.equal(1);
      expect(map.addBoundingControl.callCount).to.equal(1);
    });

    it('should only add controls if data exists', function () {
      const noData = {
        geohashGridAgg: { vis: { params: {} } },
        geoJson: {
          features: [],
          properties: {},
          hits: 20
        }
      };
      tilemap = createTileMap(null, null, noData);

      tilemap._appendMap($selection);
      expect(tilemap.maps).to.have.length(1);

      const map = tilemap.maps[0];
      expect(map.addTitle.callCount).to.equal(0);
      expect(map.addFitControl.callCount).to.equal(0);
      expect(map.addBoundingControl.callCount).to.equal(0);
    });

    it('should append title if set in the data object', function () {
      const mapTitle = 'Test Title';
      tilemap = createTileMap(null, null, _.assign({ title: mapTitle }, geoJsonData));
      tilemap._appendMap($selection);
      const map = tilemap.maps[0];

      expect(map.addTitle.callCount).to.equal(1);
      expect(map.addTitle.firstCall.calledWith(mapTitle)).to.equal(true);
    });
  });

  describe('destroy', function () {
    const maps = [];
    const mapCount = 5;

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
