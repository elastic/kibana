import expect from 'expect.js';
import ngMock from 'ng_mock';

describe('tilemaptest - TileMapSettingsTests-disabled', function () {

  let tilemapSettings;
  let tilemapsConfig;

  beforeEach(ngMock.module('kibana', ($provide) => {
    $provide.decorator('tilemapsConfig', () => ({
      enableManifestRetrieval: false
    }));
  }));

  beforeEach(ngMock.inject(($injector) => {
    tilemapSettings = $injector.get('tilemapSettings');
    tilemapsConfig = $injector.get('tilemapsConfig');
  }));


  describe('getting settings', function () {

    beforeEach(() => {
      tilemapSettings.loadSettings();
    });

    it('should get error', async function () {

      expect(tilemapSettings.hasError()).to.be.true();
      expect(tilemapSettings.getError().message)
        .to.contain('Retrieval of the manifest has been disabled. Cannot retrieve map service metadata.');

    });


  });

});
