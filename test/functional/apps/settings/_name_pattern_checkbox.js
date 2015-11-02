define(function (require) {
  var Common = require('../../../support/pages/Common');
  var SettingsPage = require('../../../support/pages/SettingsPage');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd) {
    bdd.describe('name is pattern checkbox', function () {
      var common;
      var settingsPage;

      bdd.before(function () {
        common = new Common(this.remote);
        settingsPage = new SettingsPage(this.remote);
      });

      bdd.it('should be hidden with time based unchecked', function () {
        var self = this;
        return settingsPage.getTimeBasedEventsCheckbox()
        .then(function (selected) {
          // uncheck the 'time-based events' checkbox
          return selected.click();
        })
        // try to find the name is pattern checkbox (shouldn't find it)
        .then(function () {
          return settingsPage.getNameIsPatternCheckbox();
        })
        .then(function () {
          // we expect the promise above to fail
          var handler = common.handleError(self);
          handler(
            'Did not expect to find the Name is Pattern checkbox when the TimeBasedEvents checkbox is unchecked'
          );
        })
        .catch(function () {
          // we expect this failure since the 'name is pattern' checkbox should be hidden
          return;
        });
      });
    });
  };
});
