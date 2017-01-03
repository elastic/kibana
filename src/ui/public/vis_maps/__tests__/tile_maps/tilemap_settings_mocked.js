import expect from 'expect.js';
import ngMock from 'ng_mock';
import url from 'url';

describe('tilemaptest - TileMapSettingsTests-mocked', function () {
  let theTileMapSettings;
  let theTilemapsConfig;
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
  beforeEach(ngMock.inject(function (Private, tilemapSettings, tilemapsConfig) {
    theTileMapSettings = tilemapSettings;
    theTilemapsConfig = tilemapsConfig;

    //mock the use of a manifest
    theTilemapsConfig.deprecated.isOverridden = false;
    oldGetManifest = theTileMapSettings._getTileServiceManifest;
    theTileMapSettings._getTileServiceManifest = mockGetManifest;
  }));

  afterEach(function () {
    //restore overrides.
    theTilemapsConfig.isOverridden = true;
    theTileMapSettings._getTileServiceManifest = oldGetManifest;
  });


  describe('getting settings', function () {

    beforeEach(function (done) {
      theTileMapSettings.loadSettings().then(function () {
        done();
      });
    });


    it('should get url', async function () {

      const mapUrl = theTileMapSettings.getUrl();
      expect(mapUrl.indexOf('{x}') > -1).to.be.ok();
      expect(mapUrl.indexOf('{y}') > -1).to.be.ok();
      expect(mapUrl.indexOf('{z}') > -1).to.be.ok();

      const urlObject = url.parse(mapUrl, true);
      expect(urlObject.host.endsWith('elastic.co')).to.be.ok();
      expect(urlObject.query).to.have.property('my_app_name');
      expect(urlObject.query).to.have.property('elastic_tile_service_tos');

    });

    it('should get options', async function () {
      const options = theTileMapSettings.getOptions();
      expect(options).to.have.property('minZoom');
      expect(options).to.have.property('maxZoom');
      expect(options).to.have.property('attribution');
    });

  });

  describe('modify', function () {

    beforeEach(function (done) {
      theTileMapSettings.addQueryParams({ foo: 'bar' });
      theTileMapSettings.addQueryParams({ bar: 'stool' });
      theTileMapSettings.addQueryParams({ foo: 'tstool' });
      theTileMapSettings.loadSettings().then(function () {
        done();
      });

    });


    it('addQueryParameters', async function () {

      const mapUrl = theTileMapSettings.getUrl();
      const urlObject = url.parse(mapUrl, true);
      expect(urlObject.query).to.have.property('foo');
      expect(urlObject.query).to.have.property('bar');
      expect(urlObject.query.foo).to.equal('tstool');
      expect(urlObject.query.bar).to.equal('stool');

    });


  });

});
