define(function (require) {
  var Common = require('../../../support/pages/Common');
  var SettingsPage = require('../../../support/pages/SettingsPage');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd) {
    bdd.describe('initial state', function () {
      var common;
      var settingsPage;

      bdd.before(function () {
        common = new Common(this.remote);
        settingsPage = new SettingsPage(this.remote);
      });

      bdd.it('should load with time pattern checked', function () {
        return settingsPage.getTimeBasedEventsCheckbox().isSelected()
        .then(function (selected) {
          expect(selected).to.be.ok();
        })
      });

      bdd.it('should load with name pattern unchecked', function () {
        return settingsPage.getNameIsPatternCheckbox().isSelected()
        .then(function (selected) {
          expect(selected).to.not.be.ok();
        });
      });

      bdd.it('should contain default index pattern', function () {
        var defaultPattern = 'logstash-*';

        return settingsPage.getIndexPatternField().getProperty('value')
        .then(function (pattern) {
          expect(pattern).to.be(defaultPattern);
        })
      });

      bdd.it('should not select the time field', function () {
        return settingsPage.getTimeFieldNameField().isSelected()
        .then(function (timeFieldIsSelected) {
          common.log('timeField isSelected = ' + timeFieldIsSelected);
          expect(timeFieldIsSelected).to.not.be.ok();
        });
      });

      // var testSubName = 'testSettingsInitialState';
      // function screenshotError(reason) {
      //   return common.screenshotError(testSubName, reason);
      // }
    });
  };
});
