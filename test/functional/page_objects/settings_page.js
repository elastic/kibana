/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { map as mapAsync } from 'bluebird';

export function SettingsPageProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const config = getService('config');
  const remote = getService('remote');
  const find = getService('find');
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

    async clickKibanaSavedObjects() {
      await this.clickLinkText('Saved Objects');
    }

    async clickKibanaIndices() {
      log.debug('clickKibanaIndices link');
      await this.clickLinkText('Index Patterns');
    }

    async getAdvancedSettings(propertyName) {
      log.debug('in getAdvancedSettings');
      const setting =  await testSubjects.find(`advancedSetting-editField-${propertyName}`);
      return await setting.getProperty('value');
    }

    async getAdvancedSettingCheckbox(propertyName) {
      log.debug('in getAdvancedSettingCheckbox');
      const setting =  await testSubjects.find(`advancedSetting-editField-${propertyName}`);
      return await setting.getProperty('checked');
    }

    async clearAdvancedSettings(propertyName) {
      await testSubjects.click(`advancedSetting-resetField-${propertyName}`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async setAdvancedSettingsSelect(propertyName, propertyValue) {
      await remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector(`[data-test-subj="advancedSetting-editField-${propertyName}"] option[value="${propertyValue}"]`).click();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click(`advancedSetting-saveEditField-${propertyName}`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async setAdvancedSettingsInput(propertyName, propertyValue) {
      const input = await testSubjects.find(`advancedSetting-editField-${propertyName}`);
      await input.clearValue();
      await input.type(propertyValue);
      await testSubjects.click(`advancedSetting-saveEditField-${propertyName}`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async toggleAdvancedSettingCheckbox(propertyName) {
      const checkbox = await testSubjects.find(`advancedSetting-editField-${propertyName}`);
      await checkbox.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click(`advancedSetting-saveEditField-${propertyName}`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async navigateTo() {
      await PageObjects.common.navigateToApp('settings');
    }

    async getIndexPatternField() {
      return await testSubjects.find('createIndexPatternNameInput');
    }

    async clickTimeFieldNameField() {
      return await testSubjects.click('createIndexPatternTimeFieldSelect');
    }

    async getTimeFieldNameField() {
      return await testSubjects.find('createIndexPatternTimeFieldSelect');
    }

    async selectTimeFieldOption(selection) {
      // open dropdown
      await this.clickTimeFieldNameField();
      // close dropdown, keep focus
      await this.clickTimeFieldNameField();
      await PageObjects.header.waitUntilLoadingHasFinished();
      return await retry.try(async () => {
        log.debug(`selectTimeFieldOption(${selection})`);
        const timeFieldOption = await this.getTimeFieldOption(selection);
        await timeFieldOption.click();
        const selected = await timeFieldOption.isSelected();
        if (!selected) throw new Error('option not selected: ' + selected);
      });
    }

    async getTimeFieldOption(selection) {
      return await find.displayedByCssSelector('option[value="' + selection + '"]');
    }

    async getCreateIndexPatternButton() {
      return await testSubjects.find('createIndexPatternCreateButton');
    }

    async getCreateButton() {
      return await find.displayedByCssSelector('[type="submit"]');
    }

    async clickDefaultIndexButton() {
      await testSubjects.click('setDefaultIndexPatternButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickDeletePattern() {
      await testSubjects.click('deleteIndexPatternButton');
    }

    async getIndexPageHeading() {
      return await testSubjects.find('indexPatternTitle');
    }

    getConfigureHeader() {
      return remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('h1');
    }

    getTableHeader() {
      return remote.setFindTimeout(defaultFindTimeout)
        .findAllByCssSelector('table.euiTable thead tr th');
    }

    sortBy(columnName) {
      return remote.setFindTimeout(defaultFindTimeout)
        .findAllByCssSelector('table.euiTable thead tr th button')
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
        .findByCssSelector('table.euiTable tbody tr:nth-child(' +
          (rowNumber + 1) + ') td.euiTableRowCell:nth-child(' +
          (colNumber + 1) + ')'
        );
    }

    async getFieldsTabCount() {
      return retry.try(async () => {
        const text = await testSubjects.getVisibleText('tab-count-indexedFields');
        return text.replace(/\((.*)\)/, '$1');
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

    async filterField(name) {
      const input = await testSubjects.find('indexPatternFieldFilter');
      await input.clearValue();
      await input.type(name);
    }

    async openControlsByName(name) {
      await this.filterField(name);
      const tableFields = await remote.setFindTimeout(defaultFindTimeout)
        .findAllByCssSelector('table.euiTable tbody tr.euiTableRow td.euiTableRowCell:first-child')
        .getVisibleText();

      await remote.setFindTimeout(defaultFindTimeout)
        .findAllByCssSelector(`table.euiTable tbody tr.euiTableRow:nth-child(${tableFields.indexOf(name) + 1})
          td:last-child button`)
        .click();
    }

    async increasePopularity() {
      await testSubjects.click('fieldIncreasePopularityButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    getPopularity() {
      return remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('input[ng-model="editor.field.count"]')
        .getProperty('value');
    }

    async controlChangeCancel() {
      await testSubjects.click('fieldCancelButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async controlChangeSave() {
      await testSubjects.click('fieldSaveButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async createIndexPattern(indexPatternName, timefield = '@timestamp') {
      await retry.try(async () => {
        await this.navigateTo();
        await this.clickKibanaIndices();
        await this.clickOptionalAddNewButton();
        await this.setIndexPatternField(indexPatternName);
        await PageObjects.common.sleep(2000);
        await (await this.getCreateIndexPatternGoToStep2Button()).click();
        await PageObjects.common.sleep(2000);
        if (timefield) {
          await this.selectTimeFieldOption(timefield);
        }
        await (await this.getCreateIndexPatternCreateButton()).click();
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

      return await this.getIndexPatternIdFromUrl();
    }

    //adding a method to check if the create index pattern button is visible(while adding more than 1 index pattern)

    async clickOptionalAddNewButton() {
      const buttonParent = await testSubjects.find('createIndexPatternParent');
      const buttonVisible = (await buttonParent.getProperty('innerHTML')).includes('createIndexPatternButton');
      log.debug('found the button ' + buttonVisible);
      if(buttonVisible) {
        await testSubjects.click('createIndexPatternButton');
      }
    }

    async getIndexPatternIdFromUrl() {
      const currentUrl = await remote.getCurrentUrl();
      const indexPatternId = currentUrl.match(/.*\/(.*)/)[1];

      log.debug('index pattern ID: ', indexPatternId);

      return indexPatternId;
    }

    async setIndexPatternField(indexPatternName = 'logstash-') {
      log.debug(`setIndexPatternField(${indexPatternName})`);
      const field = await this.getIndexPatternField();
      await field.clearValue();
      await field.type(indexPatternName);
    }

    async getCreateIndexPatternGoToStep2Button() {
      return await testSubjects.find('createIndexPatternGoToStep2Button');
    }

    async getCreateIndexPatternCreateButton() {
      return await testSubjects.find('createIndexPatternCreateButton');
    }

    async clickOnOnlyIndexPattern() {
      return await testSubjects.click('indexPatternLink');
    }

    async removeIndexPattern() {
      let alertText;
      await retry.try(async () => {
        log.debug('click delete index pattern button');
        await this.clickDeletePattern();
      });
      await retry.try(async () => {
        log.debug('getAlertText');
        alertText = await testSubjects.getVisibleText('confirmModalTitleText');
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
        await this.setFieldFormat(format.format);
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
      await testSubjects.click('addScriptedFieldLink');
    }

    async clickSaveScriptedField() {
      log.debug('click Save Scripted Field');
      await remote.setFindTimeout(defaultFindTimeout)
        .findByCssSelector('button[aria-label="Create Field"]')
        .click();
    }

    async setScriptedFieldName(name) {
      log.debug('set scripted field name = ' + name);
      await testSubjects.setValue('editorFieldName', name);
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

    async setFieldFormat(format) {
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
      await testSubjects.setValue('editorFieldCount', popularity);
    }

    async setScriptedFieldScript(script) {
      log.debug('set scripted field script = ' + script);
      await testSubjects.setValue('editorFieldScript', script);
    }

    async importFile(path, overwriteAll = true) {
      log.debug(`importFile(${path})`);

      log.debug(`Clicking importObjects`);
      await testSubjects.click('importObjects');
      log.debug(`Setting the path on the file input`);
      await find.setValue('.euiFilePicker__input', path);
      if (!overwriteAll) {
        log.debug(`Toggling overwriteAll`);
        await testSubjects.click('importSavedObjectsOverwriteToggle');
      } else {
        log.debug(`Leaving overwriteAll alone`);
      }
      await testSubjects.click('importSavedObjectsImportBtn');
      log.debug(`done importing the file`);
    }

    async clickImportDone() {
      await testSubjects.click('importSavedObjectsDoneBtn');
    }

    async clickConfirmConflicts() {
      await testSubjects.click('importSavedObjectsConfirmBtn');
    }

    async setImportIndexFieldOption(child) {
      await find
        .clickByCssSelector(`select[data-test-subj="managementChangeIndexSelection"] > option:nth-child(${child})`);
    }

    async clickChangeIndexConfirmButton() {
      await testSubjects.click('changeIndexConfirmButton');
    }

    async clickVisualizationsTab() {
      await testSubjects.click('objectsTab-visualizations');
    }

    async clickSearchesTab() {
      await testSubjects.click('objectsTab-searches');
    }

    async getVisualizationRows() {
      return await testSubjects.findAll(`objectsTableRow`);
    }

    async waitUntilSavedObjectsTableIsNotLoading() {
      return retry.try(async () => {
        const exists = await find.existsByDisplayedByCssSelector('*[data-test-subj="savedObjectsTable"] .euiBasicTable-loading');
        if (exists) {
          throw new Error('Waiting');
        }
        return true;
      });
    }

    async getSavedObjectsInTable() {
      const table = await testSubjects.find('savedObjectsTable');
      const cells = await table.findAll('css selector', 'td:nth-child(3)');

      const objects = [];
      for (const cell of cells) {
        objects.push(await cell.getVisibleText());
      }

      return objects;
    }
  }

  return new SettingsPage();
}
