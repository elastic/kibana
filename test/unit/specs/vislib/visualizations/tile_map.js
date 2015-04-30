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
  var mapTypes = ['Scaled Circle Markers', 'Shaded Circle Markers', 'Shaded Geohash Grid'];

  angular.module('TileMapFactory', ['kibana']);

  dataArray.forEach(function (data, i) {

    mapTypes.forEach(function (type, j) {

      describe('TileMap Test Suite for ' + mapTypes[j] + ' with ' + names[i] + ' data', function () {
        var vis;
        var visLibParams = {
          isDesaturated: true,
          addLeafletPopup: true,
          type: 'tile_map',
          mapType: type
        };

        beforeEach(function () {
          module('TileMapFactory');
        });

        beforeEach(function () {
          inject(function (Private) {
            vis = Private(require('vislib_fixtures/_vis_fixture'))(visLibParams);
            require('css!components/vislib/styles/main');
            vis.render(data);
          });
        });

        afterEach(function () {
          vis.handler.charts.forEach(function (chart) {
            chart.destroy();
          });
          $(vis.el).remove();
          vis = null;
        });

        describe('draw method', function () {
          var leafletContainer;
          var isDrawn;

          it('should return a function', function () {
            vis.handler.charts.forEach(function (chart) {
              expect(_.isFunction(chart.draw())).to.be(true);
            });
          });

          it('should draw a Leaflet map to the DOM', function () {
            leafletContainer = $(vis.el).find('.leaflet-container');
            isDrawn = (leafletContainer.length > 0);
            expect(isDrawn).to.be(true);
          });
        });

        describe('radiusScale method', function () {
          it('should return a number for scaling circle markers based on square root of count', function () {
            vis.handler.charts.forEach(function (chart) {
              var count = Math.random() * 500;
              var max = 500;
              var precision = Math.ceil(Math.random() * 5);
              var mapData = chart.chartData.geoJson;
              var i = _.random(0, mapData.features.length - 1);
              var feature = mapData.features[i];
              expect(_.isNumber(chart.radiusScale(count, max, feature))).to.be(true);
            });
          });
        });

        describe('quantizeColorScale method', function () {
          it('should return a hex color from the array of color options', function () {
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
});