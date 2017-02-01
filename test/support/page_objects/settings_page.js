
import Bluebird from 'bluebird';

import {
  defaultFindTimeout,
} from '../';

import PageObjects from './';

export default class SettingsPage {

  init(remote) {
    this.remote = remote;
  }

  async clickNavigation() {
    // TODO: find better way to target the element
    await this.remote.findDisplayedByCssSelector('.app-link:nth-child(5) a').click();
  }

  async clickLinkText(text) {
    await this.remote.findDisplayedByLinkText(text).click();
  }

  async clickKibanaSettings() {
    await this.clickLinkText('Advanced Settings');
  }

  async clickKibanaIndicies() {
    await this.clickLinkText('Index Patterns');
  }

  getAdvancedSettings(propertyName) {
    PageObjects.common.debug('in setAdvancedSettings');
    return PageObjects.common.findTestSubject('advancedSetting-' + propertyName + '-currentValue')
    .getVisibleText();
  }

  async setAdvancedSettings(propertyName, propertyValue) {
    const self = this;
    await PageObjects.common.findTestSubject('advancedSetting-' + propertyName + '-editButton').click();
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
    await PageObjects.common.sleep(1000);
    await this.remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('option[label="' + propertyValue + '"]').click();
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
    await PageObjects.common.findTestSubject('advancedSetting-' + propertyName + '-saveButton').click();
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
  }

  async navigateTo() {
    await PageObjects.common.navigateToApp('settings');
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

  async selectTimeFieldOption(selection) {
    // open dropdown
    (await this.getTimeFieldNameField()).click();
    // close dropdown, keep focus
    (await this.getTimeFieldNameField()).click();
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
    await PageObjects.common.try(async () => {
      (await this.getTimeFieldOption(selection)).click();
      const selected = (await this.getTimeFieldOption(selection)).isSelected();
      if (!selected) throw new Error('option not selected: ' + selected);
    });
  }

  getTimeFieldOption(selection) {
    return this.remote.setFindTimeout(defaultFindTimeout)
      .findDisplayedByCssSelector('option[label="' + selection + '"]');
  }

  getCreateButton() {
    return this.remote.setFindTimeout(defaultFindTimeout)
      .findDisplayedByCssSelector('[type="submit"]');
  }

  async clickDefaultIndexButton() {
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button.btn.btn-success.ng-scope').click();
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
  }

  async clickDeletePattern() {
    await this.remote.setFindTimeout(defaultFindTimeout)
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
              return PageObjects.header.isGlobalLoadingIndicatorHidden();
            });
          }
        });
      }

      const getChartTypesPromises = chartTypes.map(getChartType);
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
    const selector = 'a[data-test-subj="tab-indexedFields"] small';
    return PageObjects.common.try(() => {
      return this.remote.setFindTimeout(defaultFindTimeout / 10)
      .findByCssSelector('a[data-test-subj="tab-indexedFields"] small').getVisibleText()
      .then((theText) => {
      // the value has () around it, remove them
        return theText.replace(/\((.*)\)/, '$1');
      });
    });
  }

  async getScriptedFieldsTabCount() {
    const selector = 'a[data-test-subj="tab-scriptedFields"] small';
    return await PageObjects.common.try(async () => {
      const theText = await this.remote.setFindTimeout(defaultFindTimeout / 10)
      .findByCssSelector(selector).getVisibleText();
      return theText.replace(/\((.*)\)/, '$1');
    });
  }

  getPageSize() {
    let selectedItemLabel = '';
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('select.ng-pristine.ng-valid.ng-untouched option')
    .then(function (chartTypes) {
      function getChartType(chart) {
        const thisChart = chart;
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

      const getChartTypesPromises = chartTypes.map(getChartType);
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

  async goToPage(pageNum) {
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('ul.pagination-other-pages-list.pagination-sm.ng-scope li.ng-scope:nth-child(' +
      (pageNum + 1) + ') a.ng-binding')
    .click();
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
  }

  async openControlsRow(row) {
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('table.table.table-condensed tbody tr:nth-child(' +
      (row + 1) + ') td.ng-scope div.actions a.btn.btn-xs.btn-default i.fa.fa-pencil')
    .click();
  }

  async openControlsByName(name) {
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('div.actions a.btn.btn-xs.btn-default[href$="/' + name + '"]')
    .click();
  }

  async increasePopularity() {
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button.btn.btn-default[aria-label="Plus"]')
    .click();
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
  }

  getPopularity() {
    return this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('input[ng-model="editor.field.count"]')
    .getProperty('value');
  }

  async controlChangeCancel() {
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button.btn.btn-primary[aria-label="Cancel"]')
    .click();
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
  }

  async controlChangeSave() {
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button.btn.btn-success.ng-binding[aria-label="Update Field"]')
    .click();
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
  }

  async setPageSize(size) {
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('form.form-inline.pagination-size.ng-scope.ng-pristine.ng-valid div.form-group option[label="' + size + '"]')
    .click();
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
  }

  async createIndexPattern() {
    await PageObjects.common.try(async () => {
      await this.navigateTo();
      await this.clickKibanaIndicies();
      await this.selectTimeFieldOption('@timestamp');
      await this.getCreateButton().click();
    });
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
    await PageObjects.common.try(async () => {
      const currentUrl = await this.remote.getCurrentUrl();
      PageObjects.common.log('currentUrl', currentUrl);
      if (!currentUrl.match(/indices\/.+\?/)) {
        throw new Error('Index pattern not created');
      } else {
        PageObjects.common.debug('Index pattern created: ' + currentUrl);
      }
    });
  }

  async removeIndexPattern() {
    let alertText;
    await PageObjects.common.try(async () => {
      PageObjects.common.debug('click delete index pattern button');
      await this.clickDeletePattern();
    });
    await PageObjects.common.try(async () => {
      PageObjects.common.debug('getAlertText');
      alertText = await PageObjects.common.findTestSubject('confirmModalBodyText').getVisibleText();
    });
    await PageObjects.common.try(async () => {
      PageObjects.common.debug('acceptConfirmation');
      await PageObjects.common.findTestSubject('confirmModalConfirmButton')
        .click();
    });
    await PageObjects.common.try(async () => {
      const currentUrl = await this.remote.getCurrentUrl();
      if (currentUrl.match(/indices\/.+\?/)) {
        throw new Error('Index pattern not removed');
      }
    });
    return alertText;
  }

  async clickFieldsTab() {
    PageObjects.common.debug('click Fields tab');
    await PageObjects.common.findTestSubject('tab-indexFields')
    .click();
  }

  async clickScriptedFieldsTab() {
    PageObjects.common.debug('click Scripted Fields tab');
    await PageObjects.common.findTestSubject('tab-scriptedFields')
    .click();
  }

  async clickSourceFiltersTab() {
    PageObjects.common.debug('click Source Filters tab');
    await PageObjects.common.findTestSubject('tab-sourceFilters')
    .click();
  }

  async addScriptedField(name, language, type, format, popularity, script) {
    await this.clickAddScriptedField();
    await this.setScriptedFieldName(name);
    if (language) await this.setScriptedFieldLanguage(language);
    if (type) await this.setScriptedFieldType(type);
    if (format) {
      await this.setScriptedFieldFormat(format.format);
      // null means leave - default - which has no other settings
      // Url adds Type, Url Template, and Label Template
      // Date adds moment.js format pattern (Default: "MMMM Do YYYY, HH:mm:ss.SSS")
      // String adds Transform
      switch(format.format) {
        case 'Url':
          await this.setScriptedFieldUrlType(format.type);
          await this.setScriptedFieldUrlTemplate(format.template);
          await this.setScriptedFieldUrlLabelTemplate(format.labelTemplate);
          break;
        case 'Date':
          await this.setScriptedFieldDatePattern(format.datePattern);
          break;
        case 'String':
          await this.setScriptedFieldStringTransform(format.stringTransform);
          break;
      }
    }
    if (popularity) await this.setScriptedFieldPopularity(popularity);
    await this.setScriptedFieldScript(script);
    await this.clickSaveScriptedField();
  }

  async clickAddScriptedField() {
    PageObjects.common.debug('click Add Scripted Field');
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('a[aria-label="Add Scripted Field"]')
    .click();
  }

  async clickSaveScriptedField() {
    PageObjects.common.debug('click Save Scripted Field');
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('button[aria-label="Create Field"]')
    .click();
  }

  async setScriptedFieldName(name) {
    PageObjects.common.debug('set scripted field name = ' + name);
    await PageObjects.common.findTestSubject('editorFieldName').type(name);
  }

  async setScriptedFieldLanguage(language) {
    PageObjects.common.debug('set scripted field language = ' + language);
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('select[data-test-subj="editorFieldLang"] > option[label="' + language + '"]')
    .click();
  }

  async setScriptedFieldType(type) {
    PageObjects.common.debug('set scripted field type = ' + type);
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('select[data-test-subj="editorFieldType"] > option[label="' + type + '"]')
    .click();
  }

  async setScriptedFieldFormat(format) {
    PageObjects.common.debug('set scripted field format = ' + format);
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('select[data-test-subj="editorSelectedFormatId"] > option[label="' + format + '"]')
    .click();
  }

  async setScriptedFieldUrlType(type) {
    PageObjects.common.debug('set scripted field Url type = ' + type);
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('select[ng-model="editor.formatParams.type"] > option[label="' + type + '"]')
    .click();
  }

  async setScriptedFieldUrlTemplate(template) {
    PageObjects.common.debug('set scripted field Url Template = ' + template);
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('input[ng-model="editor.formatParams.labelTemplate"]')
    .type(template);
  }

  async setScriptedFieldUrlLabelTemplate(labelTemplate) {
    PageObjects.common.debug('set scripted field Url Label Template = ' + labelTemplate);
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('input[ng-model="editor.formatParams.labelTemplate"]')
    .type(labelTemplate);
  }

  async setScriptedFieldDatePattern(datePattern) {
    PageObjects.common.debug('set scripted field Date Pattern = ' + datePattern);
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('input[ng-model="model"]')
    .clearValue().type(datePattern);
  }

  async setScriptedFieldStringTransform(stringTransform) {
    PageObjects.common.debug('set scripted field string Transform = ' + stringTransform);
    await this.remote.setFindTimeout(defaultFindTimeout)
    .findByCssSelector('select[ng-model="editor.formatParams.transform"] > option[label="' + stringTransform + '"]')
    .click();
  }

  async setScriptedFieldPopularity(popularity) {
    PageObjects.common.debug('set scripted field popularity = ' + popularity);
    await PageObjects.common.findTestSubject('editorFieldCount').type(popularity);
  }

  async setScriptedFieldScript(script) {
    PageObjects.common.debug('set scripted field script = ' + script);
    await PageObjects.common.findTestSubject('editorFieldScript').type(script);
  }


}
