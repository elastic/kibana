import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const remote = getService('remote');
  const PageObjects = getPageObjects(['settings', 'common', 'dashboard', 'header']);

  describe('kibana settings', function describeIndexTests() {
    before(async function () {
      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.createIndexPattern();
      await PageObjects.settings.navigateTo();
    });

    after(async function afterAll() {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.removeIndexPattern();
    });

    it('should allow setting advanced settings', async function () {
      await PageObjects.settings.clickKibanaSettings();
      await PageObjects.settings.setAdvancedSettingsSelect('dateFormat:tz', 'America/Phoenix');
      const advancedSetting = await PageObjects.settings.getAdvancedSettings('dateFormat:tz');
      expect(advancedSetting).to.be('America/Phoenix');
    });

    it('should coerce an empty setting of type JSON into an empty object', async function () {
      await PageObjects.settings.clickKibanaSettings();
      await PageObjects.settings.setAdvancedSettingsInput('query:queryString:options', '', 'unsavedValueJsonTextArea');
      const advancedSetting = await PageObjects.settings.getAdvancedSettings('query:queryString:options');
      expect(advancedSetting).to.be.eql('{}');
    });

    describe('state:storeInSessionStorage', () => {
      it ('defaults to false', async () => {
        await PageObjects.settings.clickKibanaSettings();
        const storeInSessionStorage = await PageObjects.settings.getAdvancedSettings('state:storeInSessionStorage');
        expect(storeInSessionStorage).to.be('false');
      });

      it('when false, dashboard state is unhashed', async function () {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.header.setAbsoluteRange('2015-09-19 06:31:44.000', '2015-09-23 18:31:44.000');
        const currentUrl = await remote.getCurrentUrl();
        const urlPieces = currentUrl.match(/(.*)?_g=(.*)&_a=(.*)/);
        const globalState = urlPieces[2];
        const appState = urlPieces[3];

        // We don't have to be exact, just need to ensure it's greater than when the hashed variation is being used,
        // which is less than 20 characters.
        expect(globalState.length).to.be.greaterThan(20);
        expect(appState.length).to.be.greaterThan(20);
      });

      it('setting to true change is preserved', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaSettings();
        await PageObjects.settings.toggleAdvancedSettingCheckbox('state:storeInSessionStorage');
        const storeInSessionStorage = await PageObjects.settings.getAdvancedSettings('state:storeInSessionStorage');
        expect(storeInSessionStorage).to.be('true');
      });

      it('when true, dashboard state is hashed', async function () {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.header.setAbsoluteRange('2015-09-19 06:31:44.000', '2015-09-23 18:31:44.000');
        const currentUrl = await remote.getCurrentUrl();
        const urlPieces = currentUrl.match(/(.*)?_g=(.*)&_a=(.*)/);
        const globalState = urlPieces[2];
        const appState = urlPieces[3];

        // We don't have to be exact, just need to ensure it's less than the unhashed version, which will be
        // greater than 20 characters with the default state plus a time.
        expect(globalState.length).to.be.lessThan(20);
        expect(appState.length).to.be.lessThan(20);
      });

      after('navigate to settings page and turn state:storeInSessionStorage back to false', async () => {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaSettings();
        await PageObjects.settings.toggleAdvancedSettingCheckbox('state:storeInSessionStorage');
      });
    });

    describe('notifications:banner', () => {
      it('Should convert notification banner markdown into HTML', async function () {
        await PageObjects.settings.clickKibanaSettings();
        await PageObjects.settings.setAdvancedSettingsInput('notifications:banner', '# Welcome to Kibana', 'unsavedValueMarkdownTextArea');
        const bannerValue = await PageObjects.settings.getAdvancedSettings('notifications:banner');
        expect(bannerValue).to.equal('Welcome to Kibana');
      });

      after('navigate to settings page and clear notifications:banner', async () => {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaSettings();
        await PageObjects.settings.clearAdvancedSettings('notifications:banner');
      });
    });

    after(async function () {
      await PageObjects.settings.clickKibanaSettings();
      await PageObjects.settings.setAdvancedSettingsSelect('dateFormat:tz', 'UTC');
    });
  });
}
