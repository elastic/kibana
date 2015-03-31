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
  var mapTypes = ['Scaled Circle Markers', 'Shaded Circle Markers', 'Shaded Geohash Grid', 'Pins'];
  var sizes = [
    70,
    90,
    110
  ];


  angular.module('TileMapFactory', ['kibana']);

  dataArray.forEach(function (data, i) {

    mapTypes.forEach(function (type, j) {

      describe('TileMap Test Suite for ' + mapTypes[j] + ' with ' + names[i] + ' data', function () {
        var vis;
        var visLibParams = {
          isDesaturated: true,
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

          it('should draw a map', function () {
            leafletContainer = $(vis.el).find('.leaflet-container');
            isDrawn = (leafletContainer.length > 0);
            expect(isDrawn).to.be(true);
          });
        });

        sizes.forEach(function (size) {
          describe('containerTooSmall error', function () {
            it('should throw an error', function () {
              // 90px is the minimum height and width
              vis.handler.charts.forEach(function (chart) {
                $(chart.chartEl).height(size);
                $(chart.chartEl).width(size);

                if (size < 90) {
                  expect(function () {
                    chart.render();
                  }).to.throwError();
                }
              });
            });

            it('should not throw an error', function () {
              vis.handler.charts.forEach(function (chart) {
                $(chart.chartEl).height(size);
                $(chart.chartEl).width(size);

                if (size >= 90) {
                  expect(function () {
                    chart.render();
                  }).to.not.throwError();
                }
              });
            });
          });
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
              expect(_.isNumber(chart.radiusScale(count, max, precision, feature))).to.be(true);
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

      });
    });
  });
});