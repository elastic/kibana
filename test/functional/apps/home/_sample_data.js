import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'header', 'home', 'dashboard']);

  describe('sample data', function describeIndexTests() {

    before(async () => {
      await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    it('should display registered sample data sets', async ()=> {
      await retry.try(async () => {
        const exists = await PageObjects.home.doesSampleDataSetExist('flights');
        expect(exists).to.be(true);
      });
    });

    it('should install sample data set', async ()=> {
      await PageObjects.home.addSampleDataSet('flights');
      await retry.try(async () => {
        const successToastExists = await PageObjects.home.doesSampleDataSetSuccessfulInstallToastExist();
        expect(successToastExists).to.be(true);
      });

      const isInstalled = await PageObjects.home.isSampleDataSetInstalled('flights');
      expect(isInstalled).to.be(true);
    });

    describe('dashboard', () => {
      after(async () => {
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      it('should launch sample data set dashboard', async ()=> {
        await PageObjects.home.launchSampleDataSet('flights');
        await PageObjects.header.waitUntilLoadingHasFinished();
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.be(19);
      });
    });

    // needs to be in describe block so it is run after 'dashboard describe block'
    describe('uninstall', () => {
      it('should uninstall sample data set', async ()=> {
        await PageObjects.home.removeSampleDataSet('flights');
        await retry.try(async () => {
          const successToastExists = await PageObjects.home.doesSampleDataSetSuccessfulUninstallToastExist();
          expect(successToastExists).to.be(true);
        });

        const isInstalled = await PageObjects.home.isSampleDataSetInstalled('flights');
        expect(isInstalled).to.be(false);
      });
    });
  });
}
