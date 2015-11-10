// in test/support/pages/SettingsPage.js
define(function (require) {
  // the page object is created as a constructor
  // so we can provide the remote Command object
  // at runtime

  var Promise = require('bluebird');
  var Common = require('./Common');

  var defaultTimeout = 5000;
  var common;

  function SettingsPage(remote) {
    this.remote = remote;
    common = new Common(this.remote);
  }

  SettingsPage.prototype = {
    constructor: SettingsPage,

    navigateTo: function () {
      return common.navigateToApp('settings');
    },

    getTimeBasedEventsCheckbox: function () {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('input[ng-model="index.isTimeBased"]');
    },

    getTimeBasedIndexPatternCheckbox: function () {
      // fail faster since we're sometimes checking that it doesn't exist
      return this.remote.setFindTimeout(defaultTimeout / 2)
      .findByCssSelector('input[ng-model="index.nameIsPattern"]');
    },

    getIndexPatternField: function () {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('[ng-model="index.name"]');
    },

    getTimeFieldNameField: function () {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('select[ng-model="index.timeField"]');
    },

    selectTimeFieldOption: function (selection) {
      var self = this;
      return common.tryForTime(defaultTimeout * 2, function () {
        return self.getTimeFieldNameField().click();
      })
      .then(function () {
        return self.getTimeFieldNameField().click();
      })
      .then(function () {
        return self.getTimeFieldOption(selection);
      })
      // DEBUGGING
      .catch(function (err) {
        common.debug('selectTimeFieldOption: FAILED to create index pattern');
        return common.checkForKibanaApp()
        .then(function (onKibana) {
          common.debug('onKibana')
          common.debug(onKibana)
        })
        .then(function () {
          return self.remote.getCurrentUrl();
        })
        .then(function (url) {
          common.debug('FAILED on url ' + url);
          throw err
        })
      });
    },

    getTimeFieldOption: function (selection) {
      return this.remote.setFindTimeout(defaultTimeout * 2)
      .findByCssSelector('option[label="' + selection + '"]').click();
    },

    getCreateButton: function () {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('.btn');
    },

    clickCreateButton: function () {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('.btn').click();
    },

    clickDefaultIndexButton: function () {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('button.btn.btn-warning.ng-scope').click();
    },

    clickDeletePattern: function () {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('button.btn.btn-danger.ng-scope').click();
    },

    getIndexPageHeading: function () {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('h1.title.ng-binding.ng-isolate-scope');
    },

    getConfigureHeader: function () {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('h1');
    },
    getTableHeader: function () {
      return this.remote.setFindTimeout(defaultTimeout)
      .findAllByCssSelector('table.table.table-condensed thead tr th');
    },

    sortBy: function (columnName) {
      return this.remote.setFindTimeout(defaultTimeout)
      .findAllByCssSelector('table.table.table-condensed thead tr th span')
      .then(function (chartTypes) {
        function getChartType(chart) {
          return chart.getVisibleText()
          .then(function (chartString) {
            if (chartString === columnName) {
              return chart.click();
            }
          });
        }

        var getChartTypesPromises = chartTypes.map(getChartType);
        return Promise.all(getChartTypesPromises);
      });
    },

    getTableRow: function (rowNumber, colNumber) {
      return this.remote.setFindTimeout(defaultTimeout)
      // passing in zero-based index, but adding 1 for css 1-based indexes
      .findByCssSelector('div.agg-table-paginated table.table.table-condensed tbody tr:nth-child(' +
        (rowNumber + 1) + ') td.ng-scope:nth-child(' +
        (colNumber + 1) + ') span.ng-binding'
      );
    },

    getFieldsTabCount: function () {
      var self = this;
      var selector = 'li.kbn-settings-tab.active a small';

      var getText = function () {
        return self.remote.setFindTimeout(defaultTimeout)
        .findByCssSelector(selector).getVisibleText();
      }

      return common.tryForTime(defaultTimeout * 4, function () {
        return getText();
      })
      .then(function () {
        return getText();
      })
      .then(function (theText) {
        // the value has () around it, remove them
        return theText.replace(/\((.*)\)/, '$1');
      });
    },

    getPageSize: function () {
      var selectedItemLabel = '';
      return this.remote.setFindTimeout(defaultTimeout)
      .findAllByCssSelector('select.ng-pristine.ng-valid.ng-untouched option')
      .then(function (chartTypes) {
        function getChartType(chart) {
          var thisChart = chart;
          return chart.isSelected()
          .then(function (isSelected) {
            if (isSelected === true) {
              return thisChart.getProperty('label')
              .then(function (theLabel) {
                selectedItemLabel = theLabel;
              });
            }
          });
        }

        var getChartTypesPromises = chartTypes.map(getChartType);
        return Promise.all(getChartTypesPromises);
      })
      .then(function () {
        return selectedItemLabel;
      });
    },

    getPageFieldCount: function () {
      return this.remote.setFindTimeout(defaultTimeout)
      .findAllByCssSelector('div.agg-table-paginated table.table.table-condensed tbody tr td.ng-scope:nth-child(1) span.ng-binding');
    },

    goToPage: function (pageNum) {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('ul.pagination-other-pages-list.pagination-sm.ng-scope li.ng-scope:nth-child(' +
        (pageNum + 1) + ') a.ng-binding'
      )
      .then(function (page) {
        return page.click();
      });
    },

    openControlsRow: function (row) {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('table.table.table-condensed tbody tr:nth-child(' +
        (row + 1) + ') td.ng-scope div.actions a.btn.btn-xs.btn-default i.fa.fa-pencil'
      )
      .then(function (page) {
        return page.click();
      });
    },

    openControlsByName: function (name) {
      return this.remote.setFindTimeout(defaultTimeout * 2)
      .findByCssSelector('div.actions a.btn.btn-xs.btn-default[href$="/' + name + '"]')
      .then(function (button) {
        return button.click();
      });
    },

    increasePopularity: function () {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('button.btn.btn-default[aria-label="Plus"]')
      .then(function (button) {
        return button.click();
      });
    },

    getPopularity: function () {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('input[ng-model="editor.field.count"]')
      .then(function (input) {
        return input.getProperty('value');
      });
    },

    controlChangeCancel: function () {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('button.btn.btn-primary[aria-label="Cancel"]')
      .then(function (button) {
        return button.click();
      });
    },

    controlChangeSave: function () {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('button.btn.btn-success.ng-binding[aria-label="Update Field"]')
      .then(function (button) {
        return button.click();
      });
    },

    setPageSize: function (size) {
      return this.remote.setFindTimeout(defaultTimeout)
      .findByCssSelector('form.form-inline.pagination-size.ng-scope.ng-pristine.ng-valid div.form-group option[label="' + size + '"]')
      .then(function (button) {
        return button.click();
      });
    },

    createIndexPattern: function () {
      var self = this;

      return common.tryForTime(defaultTimeout, function () {
        return self.selectTimeFieldOption('@timestamp')
        .then(function () {
          return self.getCreateButton().click();
        });
      })
      .then(function () {
        return common.tryForTime(defaultTimeout, function () {
          return self.remote.getCurrentUrl()
          .then(function (currentUrl) {
            if (!currentUrl.match(/indices\/.+\?/)) {
              throw new Error('Index pattern not created');
            }
          });
        });
      })
      // DEBUGGING
      .catch(function (err) {
        common.debug('createIndexPattern: FAILED to create index pattern');
        return common.checkForKibanaApp()
        .then(function (onKibana) {
          common.debug('onKibana')
          common.debug(onKibana)
        })
        .then(function () {
          return self.remote.getCurrentUrl();
        })
        .then(function (url) {
          common.debug('FAILED on url ' + url);
          throw err
        })
      });
    },

    removeIndexPattern: function () {
      var self = this;
      var alertText;

      return common.tryForTime(defaultTimeout, function () {
        return self.clickDeletePattern()
        .then(function () {
          return self.remote.getAlertText();
        })
        .then(function (text) {
          alertText = text;
        })
        .then(function () {
          return self.remote.acceptAlert();
        });
      })
      .then(function () {
        return common.tryForTime(defaultTimeout, function () {
          return self.remote.getCurrentUrl()
          .then(function (currentUrl) {
            if (currentUrl.match(/indices\/.+\?/)) {
              throw new Error('Index pattern not removed');
            }
          });
        });
      })
      .then(function () {
        return alertText;
      });
    }
  };

  return SettingsPage;
});
