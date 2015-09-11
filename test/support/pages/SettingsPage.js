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
        .findByName('name');
    },

    getTimeFieldNameField: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath(
          '//body[@id=\'kibana-body\']/div[2]/div/kbn-settings-app/div/div/kbn-settings-indices/div[2]/div/div[2]/form/div[3]/select'
        );
    },

    selectTimeFieldOption: function (selection) {
      var self = this;
      return this
        .getTimeFieldNameField().click()
        .then(function () {
          return self
            .getTimeFieldNameField().click();
        })
        .then(function () {
          return self
            .getTimeFieldOption(selection);
        });
    },

    getTimeFieldOption: function (selection) {
      return this.remote
        .setFindTimeout(10000)
        .findByXpath(
          '/html/body/div[2]/div/kbn-settings-app/div/div/kbn-settings-indices/div[2]/div/div[2]/form/div[3]/select/option[@label=\'' +
          selection + '\']'
        ).click();
    },

    clickCreateButton: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByCssSelector('.btn').click();
    },

    getDefaultIndexButton: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath(
          '/html/body/div[2]/div/kbn-settings-app/div/div/kbn-settings-indices/div[2]/div/div/kbn-settings-index-header/div/div/button[1]'
        );
    },

    clickDefaultIndexButton: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath(
          '/html/body/div[2]/div/kbn-settings-app/div/div/kbn-settings-indices/div[2]/div/div/kbn-settings-index-header/div/div/button[1]'
        ).click();
    }
  };

  return SettingsPage;
});
