import expect from 'expect.js';
import ngMock from 'ng_mock';
import url from 'url';

describe('tilemaptest - TileMapSettingsTests-deprecated', function () {
  let tilemapSettings;
  let tilemapsConfig;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector) {
    tilemapSettings = $injector.get('tilemapSettings');
    tilemapsConfig = $injector.get('tilemapsConfig');
    tilemapsConfig.deprecated.isOverridden = true;
  }));


  describe('getting settings', function () {
    beforeEach(async function () {
      await tilemapSettings.loadSettings();
    });

    it('should get url', async function () {

      const mapUrl = tilemapSettings.getUrl();
      expect(mapUrl).to.contain('{x}');
      expect(mapUrl).to.contain('{y}');
      expect(mapUrl).to.contain('{z}');

      const urlObject = url.parse(mapUrl, true);
      expect(urlObject.host).to.match(/elastic.co$/);
      expect(urlObject.query).to.have.property('my_app_name');
      expect(urlObject.query).to.have.property('my_app_version');
      expect(urlObject.query).to.have.property('elastic_tile_service_tos');

    });

    it('should get options', async function () {
      const options = tilemapSettings.getOptions();
      expect(options).to.have.property('minZoom');
      expect(options).to.have.property('maxZoom');
      expect(options).to.have.property('attribution');
    });

  });

});
