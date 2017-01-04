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
      expect(mapUrl.indexOf('{x}') > -1).to.be.ok();
      expect(mapUrl.indexOf('{y}') > -1).to.be.ok();
      expect(mapUrl.indexOf('{z}') > -1).to.be.ok();

      const urlObject = url.parse(mapUrl, true);
      expect(urlObject.host.endsWith('elastic.co')).to.be.ok();
      expect(urlObject.query).to.have.property('my_app_name');
      expect(urlObject.query).to.have.property('elastic_tile_service_tos');

    });

    it('should get options', async function () {
      const options = tilemapSettings.getOptions();
      expect(options).to.have.property('minZoom');
      expect(options).to.have.property('maxZoom');
      expect(options).to.have.property('attribution');
    });

  });

  describe('modify', function () {

    beforeEach(function (done) {
      tilemapSettings.addQueryParams({ foo: 'bar' });
      tilemapSettings.addQueryParams({ bar: 'stool' });
      tilemapSettings.addQueryParams({ foo: 'tstool' });
      tilemapSettings.loadSettings().then(function () {
        done();
      });

    });


    it('addQueryParameters', async function () {

      const mapUrl = tilemapSettings.getUrl();
      const urlObject = url.parse(mapUrl, true);
      expect(urlObject.query).to.have.property('foo');
      expect(urlObject.query).to.have.property('bar');
      expect(urlObject.query.foo).to.equal('tstool');
      expect(urlObject.query.bar).to.equal('stool');

    });


  });

});
