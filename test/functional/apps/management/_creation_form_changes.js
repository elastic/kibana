import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['settings', 'common']);

  describe('user input reactions', function () {
    beforeEach(function () {
      // delete .kibana index and then wait for Kibana to re-create it
      return kibanaServer.uiSettings.replace({})
      .then(function () {
        return PageObjects.settings.navigateTo();
      })
      .then(function () {
        return PageObjects.settings.clickKibanaIndicies();
      });
    });

    it('should hide time-based index pattern when time-based option is unchecked', function () {
      const self = this;
      return PageObjects.settings.getTimeBasedEventsCheckbox()
      .then(function (selected) {
        // uncheck the 'time-based events' checkbox
        return selected.click();
      })
      // try to find the checkbox (this shouldn fail)
      .then(function () {
        const waitTime = 10000;
        return PageObjects.settings.getTimeBasedIndexPatternCheckbox(waitTime);
      })
      .then(function () {
        PageObjects.common.saveScreenshot('Settings-indices-hide-time-based-index-pattern');
        // we expect the promise above to fail
        const handler = PageObjects.common.createErrorHandler(self);
        const msg = 'Found time based index pattern checkbox';
        handler(msg);
      })
      .catch(function () {
        // we expect this failure since checkbox should be hidden
        return;
      });
    });

    it('should enable creation after selecting time field', function () {
      // select a time field and check that Create button is enabled
      return PageObjects.settings.selectTimeFieldOption('@timestamp')
      .then(function () {
        return PageObjects.settings.getCreateButton().isEnabled()
        .then(function (enabled) {
          PageObjects.common.saveScreenshot('Settings-indices-enable-creation');
          expect(enabled).to.be.ok();
        });
      });
    });
  });
}
