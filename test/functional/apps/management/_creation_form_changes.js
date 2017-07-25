import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const screenshots = getService('screenshots');
  const PageObjects = getPageObjects(['settings', 'common']);

  describe('user input reactions', function () {
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

    it('should enable creation after selecting time field', async function () {
      // select a time field and check that Create button is enabled
      await PageObjects.settings.selectTimeFieldOption('@timestamp');
      const createButton = await PageObjects.settings.getCreateButton();
      const enabled = await createButton.isEnabled();
      screenshots.take('Settings-indices-enable-creation');
      expect(enabled).to.be.ok();
    });
  });
}
