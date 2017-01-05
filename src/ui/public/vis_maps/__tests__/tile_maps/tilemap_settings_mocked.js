import expect from 'expect.js';
import ngMock from 'ng_mock';
import url from 'url';

describe('tilemaptest - TileMapSettingsTests-mocked', function () {
  let tilemapSettings;
  let tilemapsConfig;
  let oldGetManifest;

  const mockGetManifest = async function () {
    const data = JSON.parse(`
             {
                "version":"0.0.0",
                  "expiry":"14d",
                  "services":[
                  {
                    "id":"road_map",
                    "url":"https://proxy-tiles.elastic.co/v1/default/{z}/{x}/{y}.png",
                    "minZoom":0,
                    "maxZoom":12,
                    "attribution":"© [Elastic Tile Service](https://www.elastic.co/elastic-tile-service)",
                    "query_parameters":{
                      "elastic_tile_service_tos":"agree",
                      "my_app_name":"kibana"
                    }
                  }
                ]
              }
            `);

    return {
      data: data
    };
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector) {
    tilemapSettings = $injector.get('tilemapSettings');
    tilemapsConfig = $injector.get('tilemapsConfig');

    //mock the use of a manifest
    tilemapsConfig.deprecated.isOverridden = false;
    oldGetManifest = tilemapSettings._getTileServiceManifest;
    tilemapSettings._getTileServiceManifest = mockGetManifest;
  }));

  afterEach(function () {
    //restore overrides.
    tilemapsConfig.isOverridden = true;
    tilemapSettings._getTileServiceManifest = oldGetManifest;
  });


  describe('getting settings', function () {

    beforeEach(function (done) {
      tilemapSettings.loadSettings().then(function () {
        done();
      });
    });


    it('should get url', async function () {

      const mapUrl = tilemapSettings.getUrl();
      expect(mapUrl).to.contain('{x}');
      expect(mapUrl).to.contain('{y}');
      expect(mapUrl).to.contain('{z}');

      const urlObject = url.parse(mapUrl, true);
      expect(urlObject).to.have.property('hostname', 'proxy-tiles.elastic.co');
      expect(urlObject.query).to.have.property('my_app_name', 'kibana');
      expect(urlObject.query).to.have.property('elastic_tile_service_tos', 'agree');

    });

    it('should get options', async function () {
      const options = tilemapSettings.getOptions();
      expect(options).to.have.property('minZoom', 0);
      expect(options).to.have.property('maxZoom', 12);
      expect(options).to.have.property('attribution').contain('&#169;'); // html entity for ©, ensures that attribution is escaped
    });

  });

  describe('modify', function () {
    function assertQuery(expected) {
      const mapUrl = tilemapSettings.getUrl();
      const urlObject = url.parse(mapUrl, true);
      Object.keys(expected).forEach(key => {
        expect(urlObject.query).to.have.property(key, expected[key]);
      });
    }

    it('accepts an object', async () => {
      tilemapSettings.addQueryParams({ foo: 'bar' });
      await tilemapSettings.loadSettings();
      assertQuery({ foo: 'bar' });
    });

    it('merged additions with previous values', async () => {
      // ensure that changes are always additive
      tilemapSettings.addQueryParams({ foo: 'bar' });
      tilemapSettings.addQueryParams({ bar: 'stool' });
      await tilemapSettings.loadSettings();
      assertQuery({ foo: 'bar', bar: 'stool' });
    });

    it('overwrites conflicting previous values', async () => {
      // ensure that conflicts are overwritten
      tilemapSettings.addQueryParams({ foo: 'bar' });
      tilemapSettings.addQueryParams({ bar: 'stool' });
      tilemapSettings.addQueryParams({ foo: 'tstool' });
      await tilemapSettings.loadSettings();
      assertQuery({ foo: 'tstool', bar: 'stool' });
    });

  });

});
