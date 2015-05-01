define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');
  var L = require('leaflet');

  // Data
  var dataArray = [
    require('vislib_fixtures/mock_data/geohash/_geo_json'),
    require('vislib_fixtures/mock_data/geohash/_columns'),
    require('vislib_fixtures/mock_data/geohash/_rows')
  ];
  var names = ['geojson', 'columns', 'rows'];
  // TODO: Test the specific behavior of each these
  var mapTypes = ['Scaled Circle Markers', 'Shaded Circle Markers', 'Shaded Geohash Grid'];

  angular.module('TileMapFactory', ['kibana']);


  function bootstrapAndRender(data, type) {
    var vis;
    var visLibParams = {
      isDesaturated: true,
      type: 'tile_map',
      mapType: type
    };

    module('TileMapFactory');
    inject(function (Private) {
      vis = Private(require('vislib_fixtures/_vis_fixture'))(visLibParams);
      require('css!components/vislib/styles/main');
      vis.render(data);
    });

    return vis;

  }

  function destroyVis(vis) {
    $(vis.el).remove();
    vis = null;
  }

  describe('TileMap Tests', function () {
    describe('Rendering each types of tile map', function () {
      dataArray.forEach(function (data, i) {

        mapTypes.forEach(function (type, j) {

          describe('draw() ' + mapTypes[j] + ' with ' + names[i], function () {
            var vis;

            beforeEach(function () {
              vis = bootstrapAndRender(data, type);
            });

            afterEach(function () {
              destroyVis(vis);
            });

            it('should return a function', function () {
              vis.handler.charts.forEach(function (chart) {
                expect(chart.draw()).to.be.a(Function);
              });
            });

            it('should create .leaflet-container as a by product of map rendering', function () {
              expect($(vis.el).find('.leaflet-container').length).to.be.above(0);
            });

          });
        });
      });
    });


    describe('Leaflet controls', function () {
      var vis;
      var leafletContainer;

      beforeEach(function () {
        vis = bootstrapAndRender(dataArray[0], 'Scaled Circle Markers');
        leafletContainer = $(vis.el).find('.leaflet-container');
      });

      afterEach(function () {
        destroyVis(vis);
      });

      it('should attach the zoom controls', function () {
        expect(leafletContainer.find('.leaflet-control-zoom-in').length).to.be(1);
        expect(leafletContainer.find('.leaflet-control-zoom-out').length).to.be(1);
      });

      it('should attach the filter drawing button', function () {
        expect(leafletContainer.find('.leaflet-draw').length).to.be(1);
      });

      it('should attach the crop button', function () {
        expect(leafletContainer.find('.leaflet-control-fit').length).to.be(1);
      });

      it('should not attach the filter or crop buttons if no data is present', function () {
        var noData = {
          geoJson: {
            features: [],
            properties: {
              label: null,
              length: 30,
              min: 1,
              max: 608,
              precision: 1,
              allmin: 1,
              allmax: 608
            },
            hits: 20
          }
        };
        vis.render(noData);
        leafletContainer = $(vis.el).find('.leaflet-container');

        expect(leafletContainer.find('.leaflet-control-fit').length).to.be(0);
        expect(leafletContainer.find('.leaflet-draw').length).to.be(0);

      });

    });

    // Probably only neccesary to test one of these as we already know the the map will render

    describe('Methods', function () {
      var vis;
      var leafletContainer;

      beforeEach(function () {
        vis = bootstrapAndRender(dataArray[0], 'Scaled Circle Markers');
        leafletContainer = $(vis.el).find('.leaflet-container');
      });

      afterEach(function () {
        destroyVis(vis);
      });

      describe('geohashMinDistance method', function () {
        it('should return a number', function () {
          vis.handler.charts.forEach(function (chart) {
            var feature = chart.chartData.geoJson.features[0];
            expect(_.isNumber(chart.geohashMinDistance(feature))).to.be(true);
          });
        });
      });


      describe('radiusScale method', function () {
        it('should return a number', function () {
          vis.handler.charts.forEach(function (chart) {
            var count = Math.random() * 50;
            var max = 50;
            var precision = 1;
            var feature = chart.chartData.geoJson.features[0];
            expect(_.isNumber(chart.radiusScale(count, max, feature))).to.be(true);
          });
        });
      });

      describe('quantizeColorScale method', function () {
        it('should return a hex color', function () {
          vis.handler.charts.forEach(function (chart) {
            var reds = ['#fed976', '#feb24c', '#fd8d3c', '#f03b20', '#bd0026'];
            var count = Math.random() * 300;
            var min = 0;
            var max = 300;
            expect(_.indexOf(reds, chart.quantizeColorScale(count, min, max))).to.not.be(-1);
          });
        });
      });

      describe('nearestFeature method', function () {
        it('should return a geoJson feature object', function () {
          vis.handler.charts.forEach(function (chart) {
            var lat = (Math.random() * 180) - 90;
            var lng = (Math.random() * 360) - 180;
            var point = L.latLng(lat, lng);
            var mapData = chart.chartData.geoJson;
            expect(_.isObject(chart.nearestFeature(point, mapData))).to.be(true);
            expect(chart.nearestFeature(point, mapData).type).to.be('Feature');
          });
        });
      });

      describe('tooltipProximity method', function () {
        it('should return true if feature is close enough to event latlng to display tooltip', function () {
          vis.handler.charts.forEach(function (chart) {
            var zoom = _.random(1, 12);
            var mapData = chart.chartData.geoJson;
            var i = _.random(0, mapData.features.length - 1);
            var feature = mapData.features[i];
            var point = feature.properties.latLng;
            var map = chart.maps[0];
            expect(chart.tooltipProximity(point, zoom, feature, map)).to.be(true);
          });
        });
        it('should return false if feature is not close enough to event latlng to display tooltip', function () {
          vis.handler.charts.forEach(function (chart) {
            var zoom = _.random(1, 12);
            var mapData = chart.chartData.geoJson;
            var i = _.random(0, mapData.features.length - 1);
            var feature = mapData.features[i];
            var point = L.latLng(90, -180);
            var map = chart.maps[0];
            expect(chart.tooltipProximity(point, zoom, feature, map)).to.be(false);
          });
        });
      });

      describe('geohashMinDistance method', function () {
        it('should return the max distance in meters for sizing circle markers to fit within feature geohash', function () {
          vis.handler.charts.forEach(function (chart) {
            var mapData = chart.chartData.geoJson;
            var i = _.random(0, mapData.features.length - 1);
            var randomFeature = mapData.features[i];
            expect(_.isFinite(chart.geohashMinDistance(randomFeature))).to.be(true);
          });
        });
      });
    });

  });
});