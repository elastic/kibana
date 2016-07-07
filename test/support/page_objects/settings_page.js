
import Bluebird from 'bluebird';

import {
  defaultFindTimeout,
} from '../';

import PageObjects from './';

export default class SettingsPage {

  init(remote) {
    this.remote = remote;
  }

  clickNavigation() {
    // TODO: find better way to target the element
    return this.remote.findDisplayedByCssSelector('.app-link:nth-child(5) a').click();
  }

  clickLinkText(text) {
    return this.remote.findDisplayedByLinkText(text).click();
  }

  clickKibanaSettings() {
    return this.clickLinkText('Advanced Settings');
  }

  clickKibanaIndicies() {
    return this.clickLinkText('Index Patterns');
  }

  clickExistingData() {
    return this.clickLinkText('Existing Data');
  }

  getAdvancedSettings(propertyName) {
    PageObjects.common.debug('in setAdvancedSettings');
    return PageObjects.common.findTestSubject('advancedSetting&' + propertyName + ' currentValue')
    .getVisibleText();
  }

  setAdvancedSettings(propertyName, propertyValue) {
    var self = this;

    return PageObjects.common.findTestSubject('advancedSetting&' + propertyName + ' editButton')
    .click()
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    })
    .then(() => {
      return PageObjects.common.sleep(1000);
    })
    .then(function setAdvancedSettingsClickPropertyValue(selectList) {
      return self.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('option[label="' + propertyValue + '"]')
      .click();
    })
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    })
    .then(function setAdvancedSettingsClickSaveButton() {
      return PageObjects.common.findTestSubject('advancedSetting&' + propertyName + ' saveButton')
      .click();
    })
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    });
  }

  getAdvancedSettings(propertyName) {
    var self = this;
    PageObjects.common.debug('in setAdvancedSettings');
    return PageObjects.common.findTestSubject('advancedSetting&' + propertyName + ' currentValue')
    .getVisibleText();
  }

  navigateTo() {
    return PageObjects.common.navigateToApp('settings');
  }

  getTimeBasedEventsCheckbox() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('input[ng-model="index.isTimeBased"]');
  }

  getTimeBasedIndexPatternCheckbox(timeout) {
    timeout = timeout || defaultFindTimeout;
    // fail faster since we're sometimes checking that it doesn't exist
    return this.remote.setFindTimeout(timeout)
    .findByCssSelector('input[ng-model="index.nameIsPattern"]');
  }

  getIndexPatternField() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('[ng-model="index.name"]');
  }

  getTimeFieldNameField() {
    return this.remote.setFindTimeout(defaultFindTimeout)
      .findDisplayedByCssSelector('select[ng-model="index.timeField"]');
  }

  selectTimeFieldOption(selection) {
    // open dropdown
    return this.getTimeFieldNameField().click()
    .then(() => {
      // close dropdown, keep focus
      return this.getTimeFieldNameField().click();
    })
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    })
    .then(() => {
      return PageObjects.common.try(() => {
        return this.getTimeFieldOption(selection).click()
        .then(() => {
          return this.getTimeFieldOption(selection).isSelected();
        })
        .then(selected => {
          if (!selected) throw new Error('option not selected: ' + selected);
        });
      });
    });
  }

  getTimeFieldOption(selection) {
    return this.remote.setFindTimeout(defaultFindTimeout)
      .findDisplayedByCssSelector('option[label="' + selection + '"]').click();
  }

  getCreateButton() {
    return this.remote.setFindTimeout(defaultFindTimeout)
      .findDisplayedByCssSelector('[type="submit"]');
  }

  clickDefaultIndexButton() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button.btn.btn-warning.ng-scope').click()
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    });
  }

  clickDeletePattern() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button.btn.btn-danger.ng-scope').click();
  }

  getIndexPageHeading() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('h1.title.ng-binding.ng-isolate-scope');
  }

  getConfigureHeader() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('h1');
  }
  getTableHeader() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('table.table.table-condensed thead tr th');
  }

  sortBy(columnName) {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('table.table.table-condensed thead tr th span')
    .then(function (chartTypes) {
      function getChartType(chart) {
        return chart.getVisibleText()
        .then(function (chartString) {
          if (chartString === columnName) {
            return chart.click()
            .then(function () {
              return PageObjects.header.getSpinnerDone();
            });
          }
        });
      }

      var getChartTypesPromises = chartTypes.map(getChartType);
      return Bluebird.all(getChartTypesPromises);
    });
  }

  getTableRow(rowNumber, colNumber) {
    return this.remote.setFindTimeout(defaultFindTimeout)
    // passing in zero-based index, but adding 1 for css 1-based indexes
    .findByCssSelector('div.agg-table-paginated table.table.table-condensed tbody tr:nth-child(' +
      (rowNumber + 1) + ') td.ng-scope:nth-child(' +
      (colNumber + 1) + ') span.ng-binding'
    );
  }

  getFieldsTabCount() {
    var self = this;
    var selector = 'li.kbn-management-tab.active a small';

    return PageObjects.common.try(function () {
      return self.remote.setFindTimeout(defaultFindTimeout / 10)
      .findByCssSelector(selector).getVisibleText()
      .then(function (theText) {
        // the value has () around it, remove them
        return theText.replace(/\((.*)\)/, '$1');
      });
    });
  }

  getPageSize() {
    var selectedItemLabel = '';
    return this.remote.setFindTimeout(defaultFindTimeout)
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
      return Bluebird.all(getChartTypesPromises);
    })
    .then(() => {
      return selectedItemLabel;
    });
  }

  getPageFieldCount() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('div.agg-table-paginated table.table.table-condensed tbody tr td.ng-scope:nth-child(1) span.ng-binding');
  }

  goToPage(pageNum) {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('ul.pagination-other-pages-list.pagination-sm.ng-scope li.ng-scope:nth-child(' +
      (pageNum + 1) + ') a.ng-binding')
    .click()
    .then(function () {
      return PageObjects.header.getSpinnerDone();
    });
  }

  openControlsRow(row) {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('table.table.table-condensed tbody tr:nth-child(' +
      (row + 1) + ') td.ng-scope div.actions a.btn.btn-xs.btn-default i.fa.fa-pencil')
    .click();
  }

  openControlsByName(name) {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('div.actions a.btn.btn-xs.btn-default[href$="/' + name + '"]')
    .click();
  }

  increasePopularity() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button.btn.btn-default[aria-label="Plus"]')
    .click()
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    });
  }

  getPopularity() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('input[ng-model="editor.field.count"]')
    .then(input => {
      return input.getProperty('value');
    });
  }

  controlChangeCancel() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button.btn.btn-primary[aria-label="Cancel"]')
    .click()
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    });
  }

  controlChangeSave() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button.btn.btn-success.ng-binding[aria-label="Update Field"]')
    .click()
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    });
  }

  setPageSize(size) {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('form.form-inline.pagination-size.ng-scope.ng-pristine.ng-valid div.form-group option[label="' + size + '"]')
    .click()
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    });
  }

  createIndexPattern() {
    return PageObjects.common.try(() => {
      return this.navigateTo()
        .then(() => {
          return this.clickExistingData();
        })
        .then(() => {
          return this.selectTimeFieldOption('@timestamp');
        })
        .then(() => {
          return this.getCreateButton().click();
        });
    })
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    })
    .then(() => {
      return PageObjects.common.try(() => {
        return this.remote.getCurrentUrl()
          .then(function (currentUrl) {
            PageObjects.common.log('currentUrl', currentUrl);

            if (!currentUrl.match(/indices\/.+\?/)) {
              throw new Error('Index pattern not created');
            } else {
              PageObjects.common.debug('Index pattern created: ' + currentUrl);
            }
          });
      });
    });
  }

  removeIndexPattern() {
    var alertText;

    return PageObjects.common.try(() => {
      PageObjects.common.debug('click delete index pattern button');
      return this.clickDeletePattern();
    })
    .then(() => {
      return PageObjects.common.try(() => {
        PageObjects.common.debug('getAlertText');
        return this.remote.getAlertText();
      });
    })
    .then(function (text) {
      alertText = text;
    })
    .then(() => {
      return PageObjects.common.try(() => {
        PageObjects.common.debug('acceptAlert');
        return this.remote.acceptAlert();
      });
    })
    .then(() => {
      return PageObjects.common.try(() => {
        return this.remote.getCurrentUrl()
        .then(function (currentUrl) {
          if (currentUrl.match(/indices\/.+\?/)) {
            throw new Error('Index pattern not removed');
          }
        });
      });
    })
    .then(() => {
      return alertText;
    });
  }

}
