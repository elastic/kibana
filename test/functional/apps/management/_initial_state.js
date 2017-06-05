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

    it('should load with name pattern unchecked', function () {
      return PageObjects.settings.getTimeBasedIndexPatternCheckbox().isSelected()
      .then(function (selected) {
        expect(selected).to.not.be.ok();
      });
    });

    it('should contain default index pattern', function () {
      const defaultPattern = 'logstash-*';

      return PageObjects.settings.getIndexPatternField().getProperty('value')
      .then(function (pattern) {
        expect(pattern).to.be(defaultPattern);
      });
    });

    it('should not select the time field', function () {
      return PageObjects.settings.getTimeFieldNameField().isSelected()
      .then(function (timeFieldIsSelected) {
        log.debug('timeField isSelected = ' + timeFieldIsSelected);
        expect(timeFieldIsSelected).to.not.be.ok();
      });
    });

    it('should not enable creation', function () {
      return PageObjects.settings.getCreateIndexPatternButton().isEnabled()
      .then(function (enabled) {
        expect(enabled).to.not.be.ok();
      });
    });
  });
}
