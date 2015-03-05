define (function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var L = require('leaflet');

  // Data
  var dataArray = [
    require('vislib_fixtures/mock_data/geohash/_geo_json'),
    require('vislib_fixtures/mock_data/geohash/_columns'),
    require('vislib_fixtures/mock_data/geohash/_rows')
  ];

  var names = ['geojson', 'columns', 'rows'];

  angular.module('TileMapFactory', ['kibana']);

  dataArray.forEach(function (data, i) {
    describe('TileMap Test Suite for ' + names[i] + ' data', function () {
      var vis;
      var visLibParams = {
        isDesaturated: true,
        type: 'tile_map',
        mapType: 'Scaled Circle Markers'
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

        beforeEach(function () {
          $(vis.el).height(400);
          $(vis.el).width(300);
        });
      });

      afterEach(function () {
       $(vis.el).remove();
       vis = null;
      });

      describe('draw method', function () {
        var leafletContainer;
        var isDrawn;

        it('should draw a map', function () {
          leafletContainer = $(vis.el).find('.leaflet-container');
          isDrawn = (leafletContainer.length > 0);
          expect(isDrawn).to.be(true);
        });
      });

      describe('containerTooSmall error', function () {
        beforeEach(function () {
          $(vis.el).height(40);
          $(vis.el).width(40);
        });

        it('should throw an error', function () {
          vis.handler.charts.forEach(function (chart) {
            expect(function () {
              chart.render();
            }).to.throwError();
          });
        });
      });

    });
  });


  describe('TileMap', function () {

    var types = ['Scaled Circle Markers', 'Shaded Circle Markers', 'Shaded Geohash Grid', 'Pin Markers'];
    var vis;
    var visLibParams = {
      isDesaturated: true,
      type: 'tile_map',
      mapType: 'Scaled Circle Markers'
    };

    beforeEach(function () {
      module('TileMapFactory');
    });

    beforeEach(function () {
      inject(function (Private) {
        vis = Private(require('vislib_fixtures/_vis_fixture'))(visLibParams);
        require('css!components/vislib/styles/main');
        vis.render(dataArray[0]);

        console.log('vis', vis);


      });
    });

    afterEach(function () {
     $(vis.el).remove();
     vis = null;
    });

    it('first test case', function() {
      expect(1 === 1).to.be(true);
    });

    it('second, has data', function() {
      expect(dataArray[0]).to.be(true);
    });

    it('map should draw', function() {
      //
    })
  });

  describe('TileMap nest 1', function () {
    beforeEach(function () {
      console.log('before each');
    });

    it('map should draw 1', function() {
      expect(1 === 1).to.be(true);
    });

    describe('TileMap nest 2', function () {
      it('map should draw 2', function() {
        expect(1 === 1).to.be(false);
      });
    });

  });

});