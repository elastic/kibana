define(function (require) {
  var expect = require('intern/dojo/node!expect.js');
  var Common = require('../../../support/pages/common');
  var SettingsPage = require('../../../support/pages/settings_page');

  return function (bdd, scenarioManager) {
    bdd.describe('initial state', function () {
      var common;
      var settingsPage;

      bdd.before(function () {
        common = new Common(this.remote);
        settingsPage = new SettingsPage(this.remote);

        return scenarioManager.reload('emptyKibana')
        .then(function () {
          return settingsPage.navigateTo();
        });
      });

      bdd.it('should load with time pattern checked', function () {
        return settingsPage.getTimeBasedEventsCheckbox().isSelected()
        .then(function (selected) {
          expect(selected).to.be.ok();
        })
        .catch(common.handleError(this));
      });

      bdd.it('should load with name pattern unchecked', function () {
        return settingsPage.getTimeBasedIndexPatternCheckbox().isSelected()
        .then(function (selected) {
          expect(selected).to.not.be.ok();
        })
        .catch(common.handleError(this));
      });

      bdd.it('should contain default index pattern', function () {
        var defaultPattern = 'logstash-*';

        return settingsPage.getIndexPatternField().getProperty('value')
        .then(function (pattern) {
          expect(pattern).to.be(defaultPattern);
        })
        .catch(common.handleError(this));
      });

      bdd.it('should not select the time field', function () {
        return settingsPage.getTimeFieldNameField().isSelected()
        .then(function (timeFieldIsSelected) {
          common.debug('timeField isSelected = ' + timeFieldIsSelected);
          expect(timeFieldIsSelected).to.not.be.ok();
        })
        .catch(common.handleError(this));
      });

      bdd.it('should not be enable creation', function () {
        return settingsPage.getCreateButton().isEnabled()
        .then(function (enabled) {
          expect(enabled).to.not.be.ok();
        })
        .catch(common.handleError(this));
      });
    });
  };
});
