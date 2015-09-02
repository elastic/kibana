// Kibana is loading. Give me a moment here. I'm loading a whole bunch of code. Don't worry, all this good stuff will be cached up for next time!
//http://localhost:5601/app/kibana#/settings/indices/?_g=%28refreshInterval:%28display:Off,pause:!f,value:0%29,time:%28from:now-15m,mode:quick,to:now%29%29
//http://localhost:5601/app/kibana#/settings/indices/?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))
// long timeout if ElasticSearch isn't running...


define([
  'intern!object',
  'intern/chai!assert',
  'intern/dojo/node!fs',
  '../support/pages/SettingsPage'
], function (registerSuite, assert, fs, SettingsPage) {

  registerSuite(function () {
    var settingsPage;
    var url = 'http://localhost:5601';
    return {
      // on setup, we create an settingsPage instance
      // that we will use for all the tests
      setup: function () {
        // curl -XDELETE http://localhost:9200/.kibana
        settingsPage = new SettingsPage(this.remote);
      },

      /*
       ** Test the default state of checboxes and the 2 text input fields
       */
      'testSettingsInitialState': function () {
        return this.remote
          .get(url)
          .then(function () {
            return settingsPage
              .getTimeBasedEventsCheckbox()
              .isSelected()
              .then(function (selected) {
                assert.strictEqual(selected, true, 'Expected the Index contains time-based events to be checked');
                return settingsPage.getNameIsPatternCheckbox()
                  .isSelected()
                  .then(function (nameIsPatternSelected) {
                    assert.strictEqual(nameIsPatternSelected, false, 'Expected the Name Is Pattern checkbox to not be checked');
                    return settingsPage.getIndexPatternField()
                      .getAttribute('value')
                      .then(function (pattern) {
                        // not getting the value
                        // assert.strictEqual(pattern, 'logstash-*', 'Expected
                        // pattern logstash-*');
                        return settingsPage.getTimeFieldNameField()
                          .getVisibleText()
                          .then(function (timeField) {
                            assert.strictEqual(timeField, '@timestamp', 'Expected Time-field name @timestamp');
                          });
                      });
                  });
              });
          });
      },

      /*
       ** Test that unchecking the Time-based Events checkbox hides the Name is pattern checkbox
       */
      'testSettingsCheckboxHide': function () {
        return this.remote
          .get('http://localhost:5601')
          .then(function () {
            return settingsPage
              .getTimeBasedEventsCheckbox()
              .then(function (selected) {
                // uncheck the 'time-based events' checkbox
                return selected.click();
              })
              .then(function () {
                return settingsPage.getNameIsPatternCheckbox();
              })
              .then(function (selected1) {
                assert.strictEqual(
                  true, false, 'Did not expect to find the Name is Pattern checkbox when the TimeBasedEvents checkbox is unchecked'
                );
              })
              .catch(function (reason) {
                // We expect to find an element not found exception.  Check the reason string for the message.
                assert.strictEqual(
                  reason.toString().indexOf('Unable to locate element') > 0, true, 'Expected to not find Name Is Pattern checkbox'
                );
                return;
              });
          });
      }
    };
  });
});
