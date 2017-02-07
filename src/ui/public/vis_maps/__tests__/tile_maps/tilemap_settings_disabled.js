import expect from 'expect.js';
import ngMock from 'ng_mock';

describe('tilemaptest - TileMapSettingsTests-disabled', function () {

  let tilemapSettings;
  let tilemapsConfig;
  let loadSettings;

  beforeEach(ngMock.module('kibana', ($provide) => {
    $provide.decorator('tilemapsConfig', () => ({
      manifestServiceUrl: 'http://foo.bar/manifest',
      enableManifestRetrieval: false,
      deprecated: {
        isOverridden: false,
        config: {
          url: '',
          options: {
            minZoom: 1,
            maxZoom: 10,
            attribution: '© [Elastic Tile Service](https://www.elastic.co/elastic_tile_service)'
          }
        },
      }
    }));
  }));

  beforeEach(ngMock.inject(($injector, $httpBackend) => {
    tilemapSettings = $injector.get('tilemapSettings');
    tilemapsConfig = $injector.get('tilemapsConfig');

    loadSettings = (expectedUrl) => {
      // body and headers copied from https://proxy-tiles.elastic.co/v1/manifest
      const MANIFEST_BODY = `{
        "services":[
          {
            "id":"road_map",
            "url":"https://proxy-tiles.elastic.co/v1/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana",
            "minZoom":0,
            "maxZoom":12,
            "attribution":"© [Elastic Tile Service](https://www.elastic.co/elastic-tile-service)"
          }
        ]
      }`;

      const MANIFEST_HEADERS = {
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-origin': '*',
        'content-length': `${MANIFEST_BODY.length}`,
        'content-type': 'application/json; charset=utf-8',
        date: (new Date()).toUTCString(),
        server: 'tileprox/20170102101655-a02e54d',
        status: '200',
      };

      $httpBackend
        .expect('GET', expectedUrl ? expectedUrl : () => true)
        .respond(MANIFEST_BODY, MANIFEST_HEADERS);

      tilemapSettings.loadSettings();

      $httpBackend.flush();
    };
  }));


  describe('getting settings', function () {

    beforeEach(() => {
      tilemapSettings.loadSettings();
    });

    it('should get error', async function () {

      expect(tilemapSettings.hasError()).to.be(true);
      expect(tilemapSettings.getError().message)
        .to.contain('Retrieval of the manifest has been disabled. Cannot retrieve map service metadata.');

    });


  });

});
