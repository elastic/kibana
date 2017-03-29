import expect from 'expect.js';
import ngMock from 'ng_mock';
import url from 'url';

describe('tilemaptest - TileMapSettingsTests-deprecated', function () {
  let tilemapSettings;
  let loadSettings;

  beforeEach(ngMock.module('kibana', ($provide) => {
    $provide.decorator('tilemapsConfig', () => ({
      manifestServiceUrl: 'https://proxy-tiles.elastic.co/v1/manifest',
      deprecated: {
        isOverridden: true,
        config: {
          url: 'https://tiles.elastic.co/v1/default/{z}/{x}/{y}.png?my_app_name=kibana_tests',
          options: {
            minZoom: 1,
            maxZoom: 10,
            attribution: '© [Elastic Tile Service](https://www.elastic.co/elastic_tile_service)'
          }
        },
      }
    }));
  }));

  beforeEach(ngMock.inject(function ($injector, $rootScope) {
    tilemapSettings = $injector.get('tilemapSettings');

    loadSettings = () => {
      tilemapSettings.loadSettings();
      $rootScope.$digest();
    };
  }));

  describe('getting settings', function () {
    beforeEach(function () {
      loadSettings();
    });

    it('should get url', function () {

      const mapUrl = tilemapSettings.getUrl();
      expect(mapUrl).to.contain('{x}');
      expect(mapUrl).to.contain('{y}');
      expect(mapUrl).to.contain('{z}');

      const urlObject = url.parse(mapUrl, true);
      expect(urlObject.hostname).to.be('tiles.elastic.co');
      expect(urlObject.query).to.have.property('my_app_name', 'kibana_tests');

    });

    it('should get options', function () {
      const options = tilemapSettings.getTMSOptions();
      expect(options).to.have.property('minZoom');
      expect(options).to.have.property('maxZoom');
      expect(options).to.have.property('attribution');
    });

  });
});
