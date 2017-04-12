import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const PageObjects = getPageObjects(['settings', 'common']);

  describe('creating and deleting default index', function describeIndexTests() {
    before(function () {
      // delete .kibana index and then wait for Kibana to re-create it
      return kibanaServer.uiSettings.replace({})
      .then(function () {
        return PageObjects.settings.navigateTo();
      })
      .then(function () {
        return PageObjects.settings.clickKibanaIndicies();
      })
      .then(function () {
        return PageObjects.settings.createIndexPattern();
      })
      .then(function () {
        return PageObjects.settings.navigateTo();
      });
    });

    after(async function afterAll() {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndicies();
      await PageObjects.settings.removeIndexPattern();
    });

    it('should allow setting advanced settings', function () {
      return PageObjects.settings.clickKibanaSettings()
      .then(function TestCallSetAdvancedSettingsForTimezone() {
        PageObjects.common.saveScreenshot('Settings-advanced-tab');
        log.debug('calling setAdvancedSetting');
        return PageObjects.settings.setAdvancedSettings('dateFormat:tz', 'America/Phoenix');
      })
      .then(function GetAdvancedSetting() {
        PageObjects.common.saveScreenshot('Settings-set-timezone');
        return PageObjects.settings.getAdvancedSettings('dateFormat:tz');
      })
      .then(function (advancedSetting) {
        expect(advancedSetting).to.be('America/Phoenix');
      });
    });

    after(function () {
      return PageObjects.settings.clickKibanaSettings()
      .then(function TestCallSetAdvancedSettingsForTimezone() {
        PageObjects.common.saveScreenshot('Settings-advanced-tab');
        log.debug('calling setAdvancedSetting');
        return PageObjects.settings.setAdvancedSettings('dateFormat:tz', 'UTC');
      });
    });
  });
}
