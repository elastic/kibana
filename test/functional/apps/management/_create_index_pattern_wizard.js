import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['settings', 'common']);

  describe('"Create Index Pattern" wizard', function () {
    beforeEach(function () {
      // delete .kibana index and then wait for Kibana to re-create it
      return kibanaServer.uiSettings.replace({})
        .then(function () {
          return PageObjects.settings.navigateTo();
        })
        .then(function () {
          return PageObjects.settings.clickKibanaIndices();
        });
    });

    describe('step 1 next button', function () {
      it('is disabled by default', async function () {
        const btn = await PageObjects.settings.getCreateIndexPatternGoToStep2Button();
        const isEnabled = await btn.isEnabled();
        expect(isEnabled).not.to.be.ok();
      });

      it('is enabled once an index pattern with matching indices has been entered', async function () {
        await PageObjects.settings.setIndexPatternField();
        await PageObjects.common.sleep(1000);
        const btn = await PageObjects.settings.getCreateIndexPatternGoToStep2Button();
        const isEnabled = await btn.isEnabled();
        expect(isEnabled).to.be.ok();
      });
    });
  });
}
