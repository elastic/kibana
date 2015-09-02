// in test/support/pages/SettingsPage.js
define(function (require) {
  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  function SettingsPage(remote) {
    this.remote = remote;
  }

  SettingsPage.prototype = {
    constructor: SettingsPage,

    getTimeBasedEventsCheckbox: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('//input[@ng-model=\'index.isTimeBased\']');
    },

    getNameIsPatternCheckbox: function () {
      return this.remote
        .setFindTimeout(2000)
        .findByXpath('//input[@ng-model=\'index.nameIsPattern\']');
    },

    getIndexPatternField: function () {
      return this.remote
        .setFindTimeout(5000)
        //findElement(By.name("name")).getAttribute("value") (from Selenium IDE -> Java)
        .findByName('name');
    },

    getTimeFieldNameField: function () {
      return this.remote
        .findByXpath(
          '//body[@id=\'kibana-body\']/div[2]/div/kbn-settings-app/div/div/kbn-settings-indices/div[2]/div/div[2]/form/div[3]/select'
        );
    },

    getCreateButton: function () {
      return this.remote
        .findByCssSelector('.btn');
    }


    // …additional page interaction tasks…
  };

  return SettingsPage;
});
