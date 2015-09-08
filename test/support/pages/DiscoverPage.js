// in test/support/pages/DiscoverPage.js
define(function (require) {
  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime
  function DiscoverPage(remote) {
    this.remote = remote;
  }

  DiscoverPage.prototype = {
    constructor: DiscoverPage,

    //a class="navbar-timepicker-time-desc"
    clickTimepicker: function () {
      return this.remote
        .setFindTimeout(10000)
        // .findByXpath('//a[@class=\'#/navbar-timepicker-time-desc\']')
        .findByXpath('/html/body/div[2]/nav/div[2]/ul[2]/li[3]/a')
        .then(function (picker) {
          return picker.click();
        });
    },

    clickAbsoluteButton: function () {
      return this.remote
        .setFindTimeout(10000)
        .findByXpath(
          '//kbn-timepicker/div/div/div[1]/div/div[1]/ul/li[3]/a'
        )
        .then(function (picker) {
          return picker.click();
        });
    },

    setFromTime: function (timeString) {
      return this.remote
        .setFindTimeout(10000)
        .findByXpath('//input[@ng-model=\'absolute.from\']')
        .then(function (picker) {
          // first delete the existing date
          return picker.type('\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
            '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
            '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + timeString);
        });
    },

    setToTime: function (timeString) {
      return this.remote
        .setFindTimeout(10000)
        .findByXpath('//input[@ng-model=\'absolute.to\']')
        .then(function (picker) {
          return picker.type('\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
            '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' +
            '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + '\b' + timeString);
        });
    },

    clickGoButton: function () {
      return this.remote
        .setFindTimeout(10000)
        .findByClassName('kbn-timepicker-go')
        .then(function (button) {
          return button.click();
        });
    },


    setAbsoluteRange: function (fromTime, toTime) {
      var self = this;
      console.log('Clicking Absolute button');
      return self
        .clickAbsoluteButton()
        .then(function () {
          console.log('Setting From Time : ' + fromTime);
          return self
            .setFromTime(fromTime)
            .then(function () {
              console.log('Setting To Time : ' + toTime);
              return self
                .setToTime(toTime)
                .then(function () {
                  return self
                    .clickGoButton();
                });
            });

        });
    },

    collapseTimepicker: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('.//*[@id=\'kibana-body\']/div[2]/config/div/div[2]/i')
        .click();
    },

    getQueryField: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('//input[@ng-model=\'state.query\']');
    },

    getQuerySearchButton: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('//button[@aria-label=\'Search\']');
    },

    getTimespanText: function () {
      return this.remote
        .setFindTimeout(10000)
        .findByXpath('.//*[@id=\'kibana-body\']/div[2]/nav/div[2]/ul[2]/li[3]/a/pretty-duration')
        .then(function (textObj) {
          return textObj
            .getVisibleText();
        });
    },

    saveSearch: function (searchName) {
      var self = this;
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('//button[@aria-label=\'Save Search\']')
        .then(function (searchButton) {
          return searchButton
            .click();
        })
        .then(function () {
          console.log('saveSearch button clicked');
          return self.remote
            .setFindTimeout(5000)
            .findById('SaveSearch')
            .then(function (searchField) {
              return searchField
                .type(searchName);
            })
            //   // click save button
            .then(function () {
              return self.remote
                .setFindTimeout(5000)
                .findByXpath('//button[@ng-disabled=\'!opts.savedSearch.title\']')
                .then(function (saveButton) {
                  return saveButton
                    .click();
                });
            });
        });
    },

    getCurrentQueryName: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('//span[@bo-bind=\'opts.savedSearch.title\']')
        .then(function (queryNameField) {
          return queryNameField
            .getVisibleText();
        });
    },


    getNewSearchButton: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('//button[@aria-label=\'New Search\']');
    },
    getSaveSearchButton: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('//button[@aria-label=\'Save Search\']');
    },
    getNewSearchButton: function () {
      return this.remote
        .setFindTimeout(5000)
        .findByXpath('//button[@aria-label=\'New Search\']');
    }

    // …additional page interaction tasks…
  };

  return DiscoverPage;
});
