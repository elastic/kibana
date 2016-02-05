define(function (require) {
  var Common = require('../../../support/pages/common');
  var SettingsPage = require('../../../support/pages/settings_page');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager) {
    bdd.describe('user input reactions', function () {
      var common;
      var settingsPage;

      bdd.before(function () {
        common = new Common(this.remote);
        settingsPage = new SettingsPage(this.remote);
      });

      bdd.beforeEach(function () {
        return scenarioManager.reload('emptyKibana')
        .then(function () {
          return settingsPage.navigateTo();
        });
      });

      bdd.it('should hide time-based index pattern when time-based option is unchecked', function () {
        var self = this;
        return settingsPage.getTimeBasedEventsCheckbox()
        .then(function (selected) {
          // uncheck the 'time-based events' checkbox
          return selected.click();
        })
        // try to find the checkbox (this shouldn fail)
        .then(function () {
          var waitTime = 10000;
          return settingsPage.getTimeBasedIndexPatternCheckbox(waitTime);
        })
        .then(function () {
          // we expect the promise above to fail
          var handler = common.handleError(self);
          var msg = 'Found time based index pattern checkbox';
          handler(msg);
        })
        .catch(function () {
          // we expect this failure since checkbox should be hidden
          return;
        });
      });

      bdd.it('should enable creation after selecting time field', function () {
        // select a time field and check that Create button is enabled
        return settingsPage.selectTimeFieldOption('@timestamp')
        .then(function () {
          return settingsPage.getCreateButton().isEnabled()
          .then(function (enabled) {
            expect(enabled).to.be.ok();
          });
        })
        .catch(common.handleError(this));
      });
    });
  };
});
