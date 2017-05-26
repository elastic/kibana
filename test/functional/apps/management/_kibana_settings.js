import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const remote = getService('remote');
  const PageObjects = getPageObjects(['settings', 'common', 'dashboard', 'header']);

  describe('creating and deleting default index', function describeIndexTests() {
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
      await PageObjects.settings.setAdvancedSettings('dateFormat:tz', 'America/Phoenix');
      const advancedSetting = await PageObjects.settings.getAdvancedSettings('dateFormat:tz');
      expect(advancedSetting).to.be('America/Phoenix');
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

    after(async function () {
      await PageObjects.settings.clickKibanaSettings();
      await PageObjects.settings.setAdvancedSettings('dateFormat:tz', 'UTC');
    });
  });
}
