define(function () {
  return function (bdd, expect, common, settingsPage) {
    console.log(arguments);
    return function () {
      bdd.it('something', function () {
        var testSubName = 'testSettingsInitialState';
        common.log('we have common stuff');
        return settingsPage.getTimeBasedEventsCheckbox().isSelected()
        .then(function (selected) {
          expect(selected).to.be.ok();
        })
        .then(function () {
          return settingsPage.getNameIsPatternCheckbox().isSelected()
          .then(function (nameIsPatternSelected) {
            expect(nameIsPatternSelected).to.not.be.ok();
          });
        })
        .then(function () {
          return settingsPage.getIndexPatternField()
          .then(function (patternField) {
            return patternField.getProperty('value')
            .then(function (pattern) {
              common.log('patternField value = ' + pattern);
              expect(pattern).to.be('logstash-*');
            });
          });
        })
        .then(function () {
          return settingsPage.getTimeFieldNameField().isSelected()
          .then(function (timeFieldIsSelected) {
            common.log('timeField isSelected = ' + timeFieldIsSelected);
            expect(timeFieldIsSelected).to.not.be.ok();
          });
        })
        .catch(function screenshotError(reason) {
          return common.screenshotError(testSubName, reason);
        });
      });
    };
  };
});
