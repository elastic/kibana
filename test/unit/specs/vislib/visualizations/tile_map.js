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
      var map;
      var mapData;
      var i;
      var feature;
      var point;
      var min;
      var max;
      var zoom;

      beforeEach(function () {
        vis = bootstrapAndRender(dataArray[0], 'Scaled Circle Markers');
        leafletContainer = $(vis.el).find('.leaflet-container');
        map = vis.handler.charts[0].maps[0];
        mapData = vis.data.geoJson;
        i = _.random(0, mapData.features.length - 1);
        feature = mapData.features[i];
        point = feature.properties.latLng;
        min = mapData.properties.allmin;
        max = mapData.properties.allmax;
        zoom = _.random(1, 12);
      });

      afterEach(function () {
        destroyVis(vis);
      });

      describe('_filterToMapBounds method', function () {
        it('should filter out data points that are outside of the map bounds', function () {
          vis.handler.charts.forEach(function (chart) {
            chart.maps.forEach(function (map) {
              var featuresLength = chart.geoJson.features.length;
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
            expect(_.isFinite(chart.geohashMinDistance(feature))).to.be(true);
          });
        });
      });

      describe('radiusScale method', function () {
        var countdata = [0, 10, 20, 30, 40, 50, 60];
        var max = 60;
        var zoom = _.random(1, 18);
        var constantZoomRadius = 0.5 * Math.pow(2, zoom);
        var precision = _.random(1, 12);
        var precisionScale = 200 / Math.pow(5, precision);
        var prev = -1;

        it('test array should return a number equal to radius', function () {
          countdata.forEach(function (data, i) {
            vis.handler.charts.forEach(function (chart) {
              var count = data;
              var pct = count / max;
              var exp = 0.5;
              var radius = Math.pow(pct, exp) * constantZoomRadius * precisionScale;
              var test = chart.radiusScale(count, max, zoom, precision);

              expect(test).to.be.a('number');
              expect(test).to.be(radius);
            });
          });
        });

        it('test array should return a radius greater than previous', function () {
          countdata.forEach(function (data, i) {
            vis.handler.charts.forEach(function (chart) {
              var count = data;
              var pct = count / max;
              var exp = 0.5;
              var radius = Math.pow(pct, exp) * constantZoomRadius * precisionScale;
              var test = chart.radiusScale(count, max, zoom, precision);

              expect(test).to.be.above(prev);
              prev = chart.radiusScale(count, max, zoom, precision);
            });
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
            expect(chart.getMinMax(data)).to.be.an(Object);
          });
        });

        it('should return the min of all features.properties.value', function () {
          vis.handler.charts.forEach(function (chart) {
            var data = chart.handler.data.data;
            var min = _.chain(data.geoJson.features)
            .deepPluck('properties.value')
            .min()
            .value();
            expect(chart.getMinMax(data).min).to.be(min);
          });
        });

        it('should return the max of all features.properties.value', function () {
          vis.handler.charts.forEach(function (chart) {
            var data = chart.handler.data.data;
            var max = _.chain(data.geoJson.features)
            .deepPluck('properties.value')
            .max()
            .value();
            expect(chart.getMinMax(data).max).to.be(max);
          });
        });
      });

      describe('dataToHeatArray method', function () {
        it('should return an array', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(chart.dataToHeatArray(max)).to.be.an(Array);
          });
        });

        it('should return an array item for each feature', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(chart.dataToHeatArray(max).length).to.be(mapData.features.length);
          });
        });

        it('should return an array item with lat, lng, metric for each feature', function () {
          vis.handler.charts.forEach(function (chart) {
            var lat = feature.geometry.coordinates[1];
            var lng = feature.geometry.coordinates[0];
            var intensity = feature.properties.value;
            var array = chart.dataToHeatArray(max);
            expect(array[i][0]).to.be(lat);
            expect(array[i][1]).to.be(lng);
            expect(array[i][2]).to.be(intensity);
          });
        });

        it('should return an array item with lat, lng, normalized metric for each feature', function () {
          vis.handler.charts.forEach(function (chart) {
            chart._attr.heatNormalizeData = true;
            var lat = feature.geometry.coordinates[1];
            var lng = feature.geometry.coordinates[0];
            var intensity = parseInt(feature.properties.value / max * 100);
            var array = chart.dataToHeatArray(max);
            expect(array[i][0]).to.be(lat);
            expect(array[i][1]).to.be(lng);
            expect(array[i][2]).to.be(intensity);
          });
        });

      });

      describe('applyShadingStyle method', function () {
        it('should return an object', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(chart.applyShadingStyle(feature, min, max)).to.be.an(Object);
          });
        });
      });

      describe('showTooltip method', function () {
        it('should create a .leaflet-popup-kibana div for the tooltip', function () {
          vis.handler.charts.forEach(function (chart) {
            chart.tooltipFormatter = function (str) {
              return '<div class="popup-stub"></div>';
            };
            var layerIds = _.keys(map._layers);
            var id = layerIds[_.random(1, layerIds.length - 1)]; // layer 0 is tileLayer
            map._layers[id].fire('mouseover');
            expect($('.popup-stub', vis.el).length).to.be(1);
          });
        });
      });

      describe('tooltipProximity method', function () {
        it('should return true if feature is close enough to event latlng to display tooltip', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(chart.tooltipProximity(point, zoom, feature, map)).to.be(true);
          });
        });

        it('should return false if feature is not close enough to event latlng to display tooltip', function () {
          vis.handler.charts.forEach(function (chart) {
            var point = L.latLng(90, -180);
            expect(chart.tooltipProximity(point, zoom, feature, map)).to.be(false);
          });
        });
      });

      describe('nearestFeature method', function () {
        it('should return an object', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(chart.nearestFeature(point)).to.be.an(Object);
          });
        });

        it('should return a geoJson feature', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(chart.nearestFeature(point).type).to.be('Feature');
          });
        });

        it('should return the geoJson feature with same latlng as point', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(chart.nearestFeature(point)).to.be(feature);
          });
        });
      });

      describe('addLatLng method', function () {
        it('should add object to properties of each feature', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(feature.properties.latLng).to.be.an(Object);
          });
        });

        it('should add latLng with lat to properties of each feature', function () {
          vis.handler.charts.forEach(function (chart) {
            var lat = feature.geometry.coordinates[1];
            expect(feature.properties.latLng.lat).to.be(lat);
          });
        });

        it('should add latLng with lng to properties of each feature', function () {
          vis.handler.charts.forEach(function (chart) {
            var lng = feature.geometry.coordinates[0];
            expect(feature.properties.latLng.lng).to.be(lng);
          });
        });
      });

    });

  });
});
