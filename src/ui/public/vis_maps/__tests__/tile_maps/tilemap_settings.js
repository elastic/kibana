import expect from 'expect.js';
import ngMock from 'ng_mock';
import url from 'url';

describe('tilemaptest - TileMapSettingsTests-deprecated', function () {
  let theTileMapSettings;
  let theTilemapsConfig;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, tilemapSettings, tilemapsConfig) {
    theTileMapSettings = tilemapSettings;
    theTilemapsConfig = tilemapsConfig;
    theTilemapsConfig.deprecated.isOverridden = true;
  }));


  describe('getting settings', function () {

    beforeEach(async function () {
      await theTileMapSettings.loadSettings();
    });

    it('should get url', async function () {

      const mapUrl = theTileMapSettings.getUrl();
      expect(mapUrl.indexOf('{x}') > -1).to.be.ok();
      expect(mapUrl.indexOf('{y}') > -1).to.be.ok();
      expect(mapUrl.indexOf('{z}') > -1).to.be.ok();

      const urlObject = url.parse(mapUrl, true);
      expect(urlObject.host.endsWith('elastic.co')).to.be.ok();
      expect(urlObject.query).to.have.property('my_app_name');
      expect(urlObject.query).to.have.property('my_app_version');
      expect(urlObject.query).to.have.property('elastic_tile_service_tos');

    });

    it('should get options', async function () {
      const options = theTileMapSettings.getOptions();
      expect(options).to.have.property('minZoom');
      expect(options).to.have.property('maxZoom');
      expect(options).to.have.property('attribution');
    });

  });

});
