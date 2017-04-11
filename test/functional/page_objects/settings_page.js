import { map as mapAsync } from 'bluebird';

export function SettingsPageProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const config = getService('config');
  const remote = getService('remote');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['header', 'common']);

  const defaultFindTimeout = config.get('timeouts.find');

  class SettingsPage {
    async clickNavigation() {
      // TODO: find better way to target the element
      await remote.findDisplayedByCssSelector('.app-link:nth-child(5) a').click();
    }

    async clickLinkText(text) {
      await retry.try(async () => {
        await remote.findDisplayedByLinkText(text).click();
      });
    }

    async clickKibanaSettings() {
      await this.clickLinkText('Advanced Settings');
    }

    async clickKibanaIndicies() {
      await this.clickLinkText('Index Patterns');
    }

    getAdvancedSettings(propertyName) {
      log.debug('in setAdvancedSettings');
      return testSubjects.find('advancedSetting-' + propertyName + '-currentValue')
      .getVisibleText();
    }

    async setAdvancedSettings(propertyName, propertyValue) {
      await testSubjects.click('advancedSetting-' + propertyName + '-editButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.sleep(1000);
      await remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('option[label="' + propertyValue + '"]').click();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('advancedSetting-' + propertyName + '-saveButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async navigateTo() {
      await PageObjects.common.navigateToApp('settings');
    }

    getTimeBasedEventsCheckbox() {
      return remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[ng-model="index.isTimeBased"]');
    }

    getTimeBasedIndexPatternCheckbox(timeout) {
      timeout = timeout || defaultFindTimeout;
      // fail faster since we're sometimes checking that it doesn't exist
      return remote.setFindTimeout(timeout)
      .findByCssSelector('input[ng-model="index.nameIsPattern"]');
    }

    getIndexPatternField() {
      return remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('[ng-model="index.name"]');
    }

    getTimeFieldNameField() {
      return remote.setFindTimeout(defaultFindTimeout)
        .findDisplayedByCssSelector('select[ng-model="index.timeField"]');
    }

    async selectTimeFieldOption(selection) {
      // open dropdown
      (await this.getTimeFieldNameField()).click();
      // close dropdown, keep focus
      (await this.getTimeFieldNameField()).click();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await retry.try(async () => {
        (await this.getTimeFieldOption(selection)).click();
        const selected = (await this.getTimeFieldOption(selection)).isSelected();
        if (!selected) throw new Error('option not selected: ' + selected);
      });
    }

    getTimeFieldOption(selection) {
      return remote.setFindTimeout(defaultFindTimeout)
        .findDisplayedByCssSelector('option[label="' + selection + '"]');
    }

    getCreateButton() {
      return remote.setFindTimeout(defaultFindTimeout)
        .findDisplayedByCssSelector('[type="submit"]');
    }

    async clickDefaultIndexButton() {
      await testSubjects.find('setDefaultIndexPatternButton').click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickDeletePattern() {
      await testSubjects.find('deleteIndexPatternButton').click();
    }

    getIndexPageHeading() {
      return testSubjects.find('indexPatternTitle');
    }

    getConfigureHeader() {
      return remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('h1');
    }

    getTableHeader() {
      return remote.setFindTimeout(defaultFindTimeout)
      .findAllByCssSelector('table.table.table-condensed thead tr th');
    }

    sortBy(columnName) {
      return remote.setFindTimeout(defaultFindTimeout)
      .findAllByCssSelector('table.table.table-condensed thead tr th span')
      .then(function (chartTypes) {
        function getChartType(chart) {
          return chart.getVisibleText()
          .then(function (chartString) {
            if (chartString === columnName) {
              return chart.click()
              .then(function () {
                return PageObjects.header.waitUntilLoadingHasFinished();
              });
            }
          });
        }

        const getChartTypesPromises = chartTypes.map(getChartType);
        return Promise.all(getChartTypesPromises);
      });
    }

    getTableRow(rowNumber, colNumber) {
      return remote.setFindTimeout(defaultFindTimeout)
      // passing in zero-based index, but adding 1 for css 1-based indexes
      .findByCssSelector('div.agg-table-paginated table.table.table-condensed tbody tr:nth-child(' +
        (rowNumber + 1) + ') td.ng-scope:nth-child(' +
        (colNumber + 1) + ') span.ng-binding'
      );
    }

    getFieldsTabCount() {
      return retry.try(() => {
        return testSubjects.find('tab-count-indexedFields')
          .getVisibleText()
          .then((theText) => {
          // the value has () around it, remove them
            return theText.replace(/\((.*)\)/, '$1');
          });
      });
    }

    async getScriptedFieldsTabCount() {
      const selector = '[data-test-subj="tab-count-scriptedFields"]';
      return await retry.try(async () => {
        const theText = await remote.setFindTimeout(defaultFindTimeout / 10)
        .findByCssSelector(selector).getVisibleText();
        return theText.replace(/\((.*)\)/, '$1');
      });
    }

    getPageSize() {
      let selectedItemLabel = '';
      return remote.setFindTimeout(defaultFindTimeout)
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
        return Promise.all(getChartTypesPromises);
      })
      .then(() => {
        return selectedItemLabel;
      });
    }

    async getFieldNames() {
      const fieldNameCells = await testSubjects.findAll('editIndexPattern indexedFieldName');
      return await mapAsync(fieldNameCells, async cell => {
        return (await cell.getVisibleText()).trim();
      });
    }

    async getFieldTypes() {
      const fieldNameCells = await testSubjects.findAll('editIndexPattern indexedFieldType');
      return await mapAsync(fieldNameCells, async cell => {
        return (await cell.getVisibleText()).trim();
      });
    }

    async getScriptedFieldLangs() {
      const fieldNameCells = await testSubjects.findAll('editIndexPattern scriptedFieldLang');
      return await mapAsync(fieldNameCells, async cell => {
        return (await cell.getVisibleText()).trim();
      });
    }

    async setFieldTypeFilter(type) {
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('select[data-test-subj="indexedFieldTypeFilterDropdown"] > option[label="' + type + '"]')
      .click();
    }

    async setScriptedFieldLanguageFilter(language) {
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('select[data-test-subj="scriptedFieldLanguageFilterDropdown"] > option[label="' + language + '"]')
      .click();
    }

    async goToPage(pageNum) {
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('ul.pagination-other-pages-list.pagination-sm.ng-scope li.ng-scope:nth-child(' +
        (pageNum + 1) + ') a.ng-binding')
      .click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async openControlsRow(row) {
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('table.table.table-condensed tbody tr:nth-child(' +
        (row + 1) + ') td.ng-scope div.actions a.btn.btn-xs.btn-default i.fa.fa-pencil')
      .click();
    }

    async openControlsByName(name) {
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('div.actions a.btn.btn-xs.btn-default[href$="/' + name + '"]')
      .click();
    }

    async increasePopularity() {
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('button.btn.btn-default[aria-label="Plus"]')
      .click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    getPopularity() {
      return remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[ng-model="editor.field.count"]')
      .getProperty('value');
    }

    async controlChangeCancel() {
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('button.btn.btn-primary[aria-label="Cancel"]')
      .click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async controlChangeSave() {
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('button.btn.btn-success.ng-binding[aria-label="Update Field"]')
      .click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async setPageSize(size) {
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector(`[data-test-subj="paginateControlsPageSizeSelect"] option[label="${size}"]`)
      .click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async createIndexPattern() {
      await retry.try(async () => {
        await this.navigateTo();
        await this.clickKibanaIndicies();
        await this.selectTimeFieldOption('@timestamp');
        await this.getCreateButton().click();
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await retry.try(async () => {
        const currentUrl = await remote.getCurrentUrl();
        log.info('currentUrl', currentUrl);
        if (!currentUrl.match(/indices\/.+\?/)) {
          throw new Error('Index pattern not created');
        } else {
          log.debug('Index pattern created: ' + currentUrl);
        }
      });
    }

    async removeIndexPattern() {
      let alertText;
      await retry.try(async () => {
        log.debug('click delete index pattern button');
        await this.clickDeletePattern();
      });
      await retry.try(async () => {
        log.debug('getAlertText');
        alertText = await testSubjects.find('confirmModalBodyText').getVisibleText();
      });
      await retry.try(async () => {
        log.debug('acceptConfirmation');
        await testSubjects.click('confirmModalConfirmButton');
      });
      await retry.try(async () => {
        const currentUrl = await remote.getCurrentUrl();
        if (currentUrl.match(/indices\/.+\?/)) {
          throw new Error('Index pattern not removed');
        }
      });
      return alertText;
    }

    async clickFieldsTab() {
      log.debug('click Fields tab');
      await testSubjects.click('tab-indexFields');
    }

    async clickScriptedFieldsTab() {
      log.debug('click Scripted Fields tab');
      await testSubjects.click('tab-scriptedFields');
    }

    async clickSourceFiltersTab() {
      log.debug('click Source Filters tab');
      await testSubjects.click('tab-sourceFilters');
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
      log.debug('click Add Scripted Field');
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('a[aria-label="Add Scripted Field"]')
      .click();
    }

    async clickSaveScriptedField() {
      log.debug('click Save Scripted Field');
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('button[aria-label="Create Field"]')
      .click();
    }

    async setScriptedFieldName(name) {
      log.debug('set scripted field name = ' + name);
      await testSubjects.find('editorFieldName').type(name);
    }

    async setScriptedFieldLanguage(language) {
      log.debug('set scripted field language = ' + language);
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('select[data-test-subj="editorFieldLang"] > option[label="' + language + '"]')
      .click();
    }

    async setScriptedFieldType(type) {
      log.debug('set scripted field type = ' + type);
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('select[data-test-subj="editorFieldType"] > option[label="' + type + '"]')
      .click();
    }

    async setScriptedFieldFormat(format) {
      log.debug('set scripted field format = ' + format);
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('select[data-test-subj="editorSelectedFormatId"] > option[label="' + format + '"]')
      .click();
    }

    async setScriptedFieldUrlType(type) {
      log.debug('set scripted field Url type = ' + type);
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('select[ng-model="editor.formatParams.type"] > option[label="' + type + '"]')
      .click();
    }

    async setScriptedFieldUrlTemplate(template) {
      log.debug('set scripted field Url Template = ' + template);
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[ng-model="editor.formatParams.labelTemplate"]')
      .type(template);
    }

    async setScriptedFieldUrlLabelTemplate(labelTemplate) {
      log.debug('set scripted field Url Label Template = ' + labelTemplate);
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[ng-model="editor.formatParams.labelTemplate"]')
      .type(labelTemplate);
    }

    async setScriptedFieldDatePattern(datePattern) {
      log.debug('set scripted field Date Pattern = ' + datePattern);
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[ng-model="model"]')
      .clearValue().type(datePattern);
    }

    async setScriptedFieldStringTransform(stringTransform) {
      log.debug('set scripted field string Transform = ' + stringTransform);
      await remote.setFindTimeout(defaultFindTimeout)
      .findByCssSelector('select[ng-model="editor.formatParams.transform"] > option[label="' + stringTransform + '"]')
      .click();
    }

    async setScriptedFieldPopularity(popularity) {
      log.debug('set scripted field popularity = ' + popularity);
      await testSubjects.find('editorFieldCount').type(popularity);
    }

    async setScriptedFieldScript(script) {
      log.debug('set scripted field script = ' + script);
      await testSubjects.find('editorFieldScript').type(script);
    }
  }

  return new SettingsPage();
}
