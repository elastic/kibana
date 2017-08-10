import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const PageObjects = getPageObjects(['settings', 'common']);

  describe('initial state', function () {
    before(function () {
      // delete .kibana index and then wait for Kibana to re-create it
      return kibanaServer.uiSettings.replace({})
      .then(function () {
        return PageObjects.settings.navigateTo();
      })
      .then(function () {
        return PageObjects.settings.clickKibanaIndices();
      });
    });

    it('should contain default index pattern', async function () {
      const defaultPattern = 'logstash-*';

      const indexPatternField = await PageObjects.settings.getIndexPatternField();
      const pattern = await indexPatternField.getProperty('value');
      expect(pattern).to.be(defaultPattern);
    });

    it('should not select the time field', async function () {
      const timeFieldNameField = await PageObjects.settings.getTimeFieldNameField();
      const timeFieldIsSelected = await timeFieldNameField.isSelected();
      log.debug('timeField isSelected = ' + timeFieldIsSelected);
      expect(timeFieldIsSelected).to.not.be.ok();
    });

    it('should not enable creation', async function () {
      const createIndexPatternButton = await PageObjects.settings.getCreateIndexPatternButton();
      const enabled = await createIndexPatternButton.isEnabled();
      expect(enabled).to.not.be.ok();
    });
  });
}
