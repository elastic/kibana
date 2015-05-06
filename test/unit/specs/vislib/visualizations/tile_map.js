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
  var mapTypes = ['Scaled Circle Markers', 'Shaded Circle Markers', 'Shaded Geohash Grid', 'Heatmap'];

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

      describe('_filterToMapBounds method', function () {
        it('should filter out data points that are outside of the map bounds', function () {
          vis.handler.charts.forEach(function (chart) {
            chart.maps.forEach(function (map) {
              var featuresLength = chart.chartData.geoJson.features.length;
              var mapFeatureLength;

              function getSize(obj) {
                var size = 0;
                var key;

                for (key in obj) { if (obj.hasOwnProperty(key)) size++; }
                return size;
              }

              map.setZoom(13); // Zoom in on the map!
              mapFeatureLength = getSize(map._layers);

              expect(mapFeatureLength).to.be.lessThan(featuresLength);
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
            var mapData = chart.chartData.geoJson;
            var i = _.random(0, mapData.features.length - 1);
            var feature = mapData.features[i];
            expect(_.isFinite(chart.radiusScale(count, max, feature))).to.be(true);
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

      describe('getMinMax method', function () {
        it('should return an object', function () {
          vis.handler.charts.forEach(function (chart) {
            var data = chart.handler.data.data;
            expect(_.isObject(chart.getMinMax(data))).to.be(true);
          });
        });

        it('should return the min of all features.properties.count', function () {
          vis.handler.charts.forEach(function (chart) {
            var data = chart.handler.data.data;
            var min = _.chain(data.geoJson.features)
            .map(function (n) {
              return n.properties.count;
            })
            .min()
            .value();
            expect(chart.getMinMax(data).min).to.be(min);
          });
        });

        it('should return the max of all features.properties.count', function () {
          vis.handler.charts.forEach(function (chart) {
            var data = chart.handler.data.data;
            var max = _.chain(data.geoJson.features)
            .map(function (n) {
              return n.properties.count;
            })
            .max()
            .value();
            expect(chart.getMinMax(data).max).to.be(max);
          });
        });
      });

      describe('dataToHeatArray method', function () {
        it('should return an array', function () {
          vis.handler.charts.forEach(function (chart) {
            var mapData = chart.chartData.geoJson;
            var max = mapData.properties.allmax;
            expect(_.isArray(chart.dataToHeatArray(mapData, max))).to.be(true);
          });
        });

        it('should return an array item for each feature', function () {
          vis.handler.charts.forEach(function (chart) {
            var mapData = chart.chartData.geoJson;
            var max = mapData.properties.allmax;
            expect(chart.dataToHeatArray(mapData, max).length).to.be(mapData.features.length);
          });
        });

        it('should return an array item with lat, lng, metric for each feature', function () {
          vis.handler.charts.forEach(function (chart) {
            var mapData = chart.chartData.geoJson;
            var max = mapData.properties.allmax;
            var i = _.random(0, mapData.features.length - 1);
            var feature = mapData.features[i];
            var lat = feature.geometry.coordinates[1];
            var lng = feature.geometry.coordinates[0];
            var intensity = feature.properties.count;
            var array = chart.dataToHeatArray(mapData, max);
            console.log(array);
            console.log(feature);
            console.log(i, array[i][0], array[i][1], array[i][2]);
            console.log(i, lat, lng, intensity);
            expect(array[i][0]).to.be(lat);
            expect(array[i][1]).to.be(lng);
            expect(array[i][2]).to.be(intensity);
          });
        });

        it('should return an array item with lat, lng, normalized metric for each feature', function () {
          vis.handler.charts.forEach(function (chart) {
            chart._attr.heatNormalizeData = true;
            var mapData = chart.chartData.geoJson;
            var max = mapData.properties.allmax;
            var i = _.random(0, mapData.features.length - 1);
            var feature = mapData.features[i];
            var lat = feature.geometry.coordinates[1];
            var lng = feature.geometry.coordinates[0];
            var intensity = parseInt(feature.properties.count / max * 100);
            var array = chart.dataToHeatArray(mapData, max);
            console.log(array);
            console.log(feature);
            console.log(i, array[i][0], array[i][1], array[i][2]);
            console.log(i, lat, lng, intensity);
            expect(array[i][0]).to.be(lat);
            expect(array[i][1]).to.be(lng);
            expect(array[i][2]).to.be(intensity);
          });
        });

      });

      describe('applyShadingStyle method', function () {
        it('should return an object', function () {
          vis.handler.charts.forEach(function (chart) {
            var mapData = chart.chartData.geoJson;
            var i = _.random(0, mapData.features.length - 1);
            var feature = mapData.features[i];
            var min = mapData.properties.allmin;
            var max = mapData.properties.allmax;
            expect(_.isObject(chart.applyShadingStyle(feature, min, max))).to.be(true);
          });
        });
      });

      describe('getBounds method', function () {
        it('should return bounds object that contains every point in mapData', function () {
          vis.handler.charts.forEach(function (chart) {
            var mapData = chart.chartData.geoJson;
            var containsPoint = [];
            var bounds = chart.getBounds(mapData);
            for (var i = 0; i < mapData.features.length; i++) {
              var pt = [mapData.features[i].geometry.coordinates[1], mapData.features[i].geometry.coordinates[0]];
              containsPoint.push(bounds.contains(pt));
            }
            containsPoint = _.compact(containsPoint);
            expect(containsPoint.length).to.be(mapData.features.length);
          });
        });
      });

      describe('showTooltip method', function () {
        it('should create a .leaflet-popup-kibana div for the tooltip', function () {
          vis.handler.charts.forEach(function (chart) {
            chart.tooltipFormatter = function (str) {
              return str;
            };
            var map = chart.maps[0];
            var mapData = chart.chartData.geoJson;
            var layerIds = _.keys(map._layers);
            var id = layerIds[_.random(1, layerIds.length - 1)]; // layer 0 is tileLayer
            map._layers[id].fire('mouseover');
            expect($(vis.el).find('.leaflet-popup-kibana').length).to.be(1);
          });
        });
      });

      describe('tooltipProximity method', function () {
        it('should return true if feature is close enough to event latlng to display tooltip', function () {
          vis.handler.charts.forEach(function (chart) {
            var mapData = chart.chartData.geoJson;
            var i = _.random(0, mapData.features.length - 1);
            var feature = mapData.features[i];
            var point = feature.properties.latLng;
            var zoom = _.random(1, 12);
            var map = chart.maps[0];
            expect(chart.tooltipProximity(point, zoom, feature, map)).to.be(true);
          });
        });

        it('should return false if feature is not close enough to event latlng to display tooltip', function () {
          vis.handler.charts.forEach(function (chart) {
            var mapData = chart.chartData.geoJson;
            var i = _.random(0, mapData.features.length - 1);
            var point = L.latLng(90, -180);
            var zoom = _.random(1, 12);
            var feature = mapData.features[i];
            var map = chart.maps[0];
            expect(chart.tooltipProximity(point, zoom, feature, map)).to.be(false);
          });
        });
      });

      describe('nearestFeature method', function () {
        it('should return an object', function () {
          vis.handler.charts.forEach(function (chart) {
            var mapData = chart.chartData.geoJson;
            var i = _.random(0, mapData.features.length - 1);
            var feature = mapData.features[i];
            var point = feature.properties.latLng;
            expect(_.isObject(chart.nearestFeature(point, mapData))).to.be(true);
          });
        });

        it('should return a geoJson feature', function () {
          vis.handler.charts.forEach(function (chart) {
            var mapData = chart.chartData.geoJson;
            var i = _.random(0, mapData.features.length - 1);
            var feature = mapData.features[i];
            var point = feature.properties.latLng;
            expect(chart.nearestFeature(point, mapData).type).to.be('Feature');
          });
        });

        it('should return the geoJson feature with same latlng as point', function () {
          vis.handler.charts.forEach(function (chart) {
            var mapData = chart.chartData.geoJson;
            var i = _.random(0, mapData.features.length - 1);
            var feature = mapData.features[i];
            var point = feature.properties.latLng;
            expect(chart.nearestFeature(point, mapData)).to.be(feature);
          });
        });
      });

      describe('addLatLng method', function () {
        it('should add object to properties of each feature', function () {
          vis.handler.charts.forEach(function (chart) {
            var map = chart.maps[0];
            var mapData = chart.addLatLng(chart.chartData.geoJson);
            var i = _.random(0, mapData.features.length - 1);
            var feature = mapData.features[i];
            expect(_.isObject(feature.properties.latLng)).to.be(true);
          });
        });

        it('should add latLng with lat to properties of each feature', function () {
          vis.handler.charts.forEach(function (chart) {
            var map = chart.maps[0];
            var mapData = chart.addLatLng(chart.chartData.geoJson);
            var i = _.random(0, mapData.features.length - 1);
            var feature = mapData.features[i];
            expect(_.isFinite(feature.properties.latLng.lat)).to.be(true);
          });
        });

        it('should add latLng with lng to properties of each feature', function () {
          vis.handler.charts.forEach(function (chart) {
            var map = chart.maps[0];
            var mapData = chart.addLatLng(chart.chartData.geoJson);
            var i = _.random(0, mapData.features.length - 1);
            var feature = mapData.features[i];
            expect(_.isFinite(feature.properties.latLng.lng)).to.be(true);
          });
        });
      });

    });

  });
});