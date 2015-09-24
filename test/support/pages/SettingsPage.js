// in test/support/pages/SettingsPage.js
define(function (require) {
  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime

  var defaultTimeout = 5000;

  function SettingsPage(remote) {
    this.remote = remote;
  }

  SettingsPage.prototype = {
    constructor: SettingsPage,

    getTimeBasedEventsCheckbox: function () {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('input[ng-model="index.isTimeBased"]');
    },

    getNameIsPatternCheckbox: function () {
      return this.remote
        .setFindTimeout(defaultTimeout / 2) // fail faster since we're sometimes checking that it doesn't exist
        .findByCssSelector('input[ng-model="index.nameIsPattern"]');
    },

    getIndexPatternField: function () {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('[ng-model="index.name"]');
    },

    getTimeFieldNameField: function () {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('select[ng-model="index.timeField"]');
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
      //console.log('selection = ' + selection);
      return this.remote
        .setFindTimeout(defaultTimeout * 2)
        .findByCssSelector('option[label="' + selection + '"]')
        .click();
    },

    getCreateButton: function () {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('.btn');
    },

    clickCreateButton: function () {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('.btn').click();
    },

    // getDefaultIndexButton: function () {
    //   return this.remote
    //     .setFindTimeout(defaultTimeout)
    //     .findByXpath(
    //       '/html/body/div[2]/div/kbn-settings-app/div/div/kbn-settings-indices/div[2]/div/div/kbn-settings-index-header/div/div/button[1]'
    //     );
    // },

    clickDefaultIndexButton: function () {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('button[tooltip="Set as default index"')
        .click();
    },

    clickDeletePattern: function () {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('button[tooltip="Remove index pattern"')
        .click();
    },

    getIndexPageHeading: function () {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('h1.title.ng-binding.ng-isolate-scope');
    },

    getConfigureHeader: function () {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('h1');
    },
    getTableHeader: function () {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findAllByCssSelector('table.table.table-condensed thead tr th');
    },


    sortBy: function (columnName) {
      // console.log('sorting by ' + columnName);
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findAllByCssSelector('table.table.table-condensed thead tr th span')
        .then(function (chartTypes) {
          // console.log('found bucket types ' + chartTypes.length);

          function getChartType(chart) {
            return chart
              .getVisibleText()
              .then(function (chartString) {
                //console.log(chartString);
                if (chartString === columnName) {
                  // console.log('sorting by ' + columnName);
                  return chart
                    .click();
                }
              });
          }
          var getChartTypesPromises = chartTypes.map(getChartType);
          return Promise.all(getChartTypesPromises);
        });
    },

    getTableRow: function (rowNumber, colNumber) {
      return this.remote
        .setFindTimeout(defaultTimeout)
        // passing in zero-based index, but adding 1 for css 1-based indexes
        .findByCssSelector('div.agg-table-paginated table.table.table-condensed tbody tr:nth-child(' +
          (rowNumber + 1) + ') td.ng-scope:nth-child(' +
          (colNumber + 1) + ') span.ng-binding'
        );
    },

    getFieldsTabCount: function () {
      return this.remote
        .setFindTimeout(defaultTimeout)
        // passing in zero-based index, but adding 1 for css 1-based indexes
        .findByCssSelector('li.kbn-settings-tab.ng-scope.active a.ng-binding small.ng-binding')
        .then(function (tabData) {
          return tabData
            .getVisibleText()
            .then(function (theText) {
              // the value has () around it, remove them
              return theText.replace(/\((.*)\)/, '$1');
            });
        });
    },

    getPageSize: function () {
      var selectedItemLabel = '';
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findAllByCssSelector('select.ng-pristine.ng-valid.ng-untouched option')
        .then(function (chartTypes) {
          //console.log('found selection options ' + chartTypes.length);

          function getChartType(chart) {
            var thisChart = chart;
            return chart
              .isSelected()
              .then(function (isSelected) {
                if (isSelected === true) {
                  //console.log('Found selected option ');
                  return thisChart
                    .getProperty('label')
                    .then(function (theLabel) {
                      // console.log('Page size = ' + theLabel);
                      selectedItemLabel = theLabel;
                    });
                }
              });
          }
          var getChartTypesPromises = chartTypes.map(getChartType);
          return Promise.all(getChartTypesPromises);
        })
        .then(function () {
          //console.log('returning types array here? ' + types);
          return selectedItemLabel;
        });
    },

    getPageFieldCount: function () {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findAllByCssSelector('div.agg-table-paginated table.table.table-condensed tbody tr td.ng-scope:nth-child(1) span.ng-binding');
    },

    goToPage: function (pageNum) {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('ul.pagination-other-pages-list.pagination-sm.ng-scope li.ng-scope:nth-child(' +
          (pageNum + 1) + ') a.ng-binding'
        )
        .then(function (page) {
          return page.click();
        });
    },

    openControlsRow: function (row) {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('table.table.table-condensed tbody tr:nth-child(' +
          (row + 1) + ') td.ng-scope div.actions a.btn.btn-xs.btn-default i.fa.fa-pencil'
        )
        .then(function (page) {
          return page.click();
        });
    },

    openControlsByName: function (name) {
      return this.remote
        .setFindTimeout(defaultTimeout * 2)
        // .findByCssSelector('div.actions a.btn.btn-xs.btn-default[href="#/settings/indices/logstash-*/field/' + name + '"]')
        .findByCssSelector('div.actions a.btn.btn-xs.btn-default[href$="/' + name + '"]')
        .then(function (button) {
          return button.click();
        });
    },

    increasePopularity: function () {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('button.btn.btn-default[aria-label="Plus"]')
        .then(function (button) {
          return button.click();
        });
    },

    getPopularity: function () {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('input.form-control.ng-pristine.ng-valid.ng-untouched.ng-valid-number')
        .then(function (input) {
          return input
            .getProperty('value');
        });
    },

    controlChangeCancel: function () {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('button.btn.btn-primary[aria-label="Cancel"]')
        .then(function (button) {
          return button.click();
        });
    },

    controlChangeSave: function () {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('button.btn.btn-success.ng-binding[aria-label="Update Field"]')
        .then(function (button) {
          return button.click();
        });
    },

    setPageSize: function (size) {
      return this.remote
        .setFindTimeout(defaultTimeout)
        .findByCssSelector('form.form-inline.pagination-size.ng-scope.ng-pristine.ng-valid div.form-group option[label="' + size + '"]')
        .then(function (button) {
          return button.click();
        });
    }


  };

  return SettingsPage;
});
