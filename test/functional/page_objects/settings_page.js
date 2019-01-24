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
import expect from 'expect.js';

export function SettingsPageProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const browser = getService('browser');
  const find = getService('find');
  const flyout = getService('flyout');
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const PageObjects = getPageObjects(['header', 'common']);

  class SettingsPage {
    async clickNavigation() {
      find.clickDisplayedByCssSelector('.app-link:nth-child(5) a');
    }
    async clickLinkText(text) {
      await find.clickByDisplayedLinkText(text);
    }
    async clickKibanaSettings() {
      await testSubjects.click('settings');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('managementSettingsTitle');
    }

    async clickKibanaSavedObjects() {
      await testSubjects.click('objects');
    }

    async clickKibanaIndices() {
      log.debug('clickKibanaIndices link');
      await testSubjects.click('indices');
    }

    async getAdvancedSettings(propertyName) {
      log.debug('in getAdvancedSettings');
      const setting = await testSubjects.find(`advancedSetting-editField-${propertyName}`);
      return await setting.getProperty('value');
    }

    async getAdvancedSettingCheckbox(propertyName) {
      log.debug('in getAdvancedSettingCheckbox');
      return await testSubjects.getProperty(`advancedSetting-editField-${propertyName}`, 'checked');
    }

    async clearAdvancedSettings(propertyName) {
      await testSubjects.click(`advancedSetting-resetField-${propertyName}`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async setAdvancedSettingsSelect(propertyName, propertyValue) {
      await find.clickByCssSelector(
        `[data-test-subj="advancedSetting-editField-${propertyName}"] option[value="${propertyValue}"]`
      );
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
      testSubjects.click(`advancedSetting-editField-${propertyName}`);
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

    async getConfigureHeader() {
      return await find.byCssSelector('h1');
    }

    async getTableHeader() {
      return await find.allByCssSelector('table.euiTable thead tr th');
    }

    async sortBy(columnName) {
      const chartTypes = await find.allByCssSelector('table.euiTable thead tr th button');
      async function getChartType(chart) {
        const chartString = await chart.getVisibleText();
        if (chartString === columnName) {
          await chart.click();
          await PageObjects.header.waitUntilLoadingHasFinished();
        }
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return Promise.all(getChartTypesPromises);
    }

    async getTableRow(rowNumber, colNumber) {
      // passing in zero-based index, but adding 1 for css 1-based indexes
      return await find.byCssSelector(
        'table.euiTable tbody tr:nth-child(' +
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
        const theText = await (await find.byCssSelector(selector))
          .getVisibleText();
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
      await find.clickByCssSelector(
        'select[data-test-subj="indexedFieldTypeFilterDropdown"] > option[label="' + type + '"]'
      );
    }

    async setScriptedFieldLanguageFilter(language) {
      await find.clickByCssSelector(
        'select[data-test-subj="scriptedFieldLanguageFilterDropdown"] > option[label="' +
            language +
            '"]'
      );
    }

    async filterField(name) {
      const input = await testSubjects.find('indexPatternFieldFilter');
      await input.clearValue();
      await input.type(name);
    }

    async openControlsByName(name) {
      await this.filterField(name);
      const tableFields = await (await find.byCssSelector(
        'table.euiTable tbody tr.euiTableRow td.euiTableRowCell:first-child'
      )).getVisibleText();

      await find.clickByCssSelector(
        `table.euiTable tbody tr.euiTableRow:nth-child(${tableFields.indexOf(name) + 1})
          td:last-child button`
      );
    }

    async increasePopularity() {
      const field = await testSubjects.find('editorFieldCount');
      await field.clearValue();
      await field.type('1');
    }

    async getPopularity() {
      return await testSubjects.getProperty('editorFieldCount', 'value');
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
        await PageObjects.header.waitUntilLoadingHasFinished();
        await this.clickKibanaIndices();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await this.clickOptionalAddNewButton();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.try(async () => {
          await this.setIndexPatternField({ indexPatternName });
        });
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
        const currentUrl = await browser.getCurrentUrl();
        log.info('currentUrl', currentUrl);
        if (!currentUrl.match(/indices\/.+\?/)) {
          throw new Error('Index pattern not created');
        } else {
          log.debug('Index pattern created: ' + currentUrl);
        }
      });

      return await this.getIndexPatternIdFromUrl();
    }

    // adding a method to check if the create index pattern button is visible when more than 1 index pattern is present
    async clickOptionalAddNewButton() {
      if (await testSubjects.isDisplayed('createIndexPatternButton')) {
        await testSubjects.click('createIndexPatternButton');
      }
    }

    async getIndexPatternIdFromUrl() {
      const currentUrl = await browser.getCurrentUrl();
      const indexPatternId = currentUrl.match(/.*\/(.*)/)[1];

      log.debug('index pattern ID: ', indexPatternId);

      return indexPatternId;
    }

    async setIndexPatternField({ indexPatternName = 'logstash-', expectWildcard = true } = {}) {
      log.debug(`setIndexPatternField(${indexPatternName})`);
      const field = await this.getIndexPatternField();
      await field.clearValue();
      await field.type(indexPatternName);
      const currentName = await field.getAttribute('value');
      log.debug(`setIndexPatternField set to ${currentName}`);
      expect(currentName).to.eql(`${indexPatternName}${expectWildcard ? '*' : ''}`);
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
        const currentUrl = await browser.getCurrentUrl();
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
        switch (format.format) {
          case 'url':
            await this.setScriptedFieldUrlType(format.type);
            await this.setScriptedFieldUrlTemplate(format.template);
            await this.setScriptedFieldUrlLabelTemplate(format.labelTemplate);
            break;
          case 'date':
            await this.setScriptedFieldDatePattern(format.datePattern);
            break;
          case 'string':
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
      await testSubjects.click('fieldSaveButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async setScriptedFieldName(name) {
      log.debug('set scripted field name = ' + name);
      const field = await testSubjects.find('editorFieldName');
      await field.clearValue();
      await field.type(name);
    }

    async setScriptedFieldLanguage(language) {
      log.debug('set scripted field language = ' + language);
      await find.clickByCssSelector(
        'select[data-test-subj="editorFieldLang"] > option[value="' + language + '"]'
      );
    }

    async setScriptedFieldType(type) {
      log.debug('set scripted field type = ' + type);
      await find.clickByCssSelector(
        'select[data-test-subj="editorFieldType"] > option[value="' + type + '"]'
      );
    }

    async setFieldFormat(format) {
      log.debug('set scripted field format = ' + format);
      await find.clickByCssSelector(
        'select[data-test-subj="editorSelectedFormatId"] > option[value="' + format + '"]'
      );
    }

    async setScriptedFieldUrlType(type) {
      log.debug('set scripted field Url type = ' + type);
      await find.clickByCssSelector(
        'select[data-test-subj="urlEditorType"] > option[value="' + type + '"]'
      );
    }

    async setScriptedFieldUrlTemplate(template) {
      log.debug('set scripted field Url Template = ' + template);
      const urlTemplateField = await find.byCssSelector(
        'input[data-test-subj="urlEditorUrlTemplate"]'
      );
      await urlTemplateField.type(template);
    }

    async setScriptedFieldUrlLabelTemplate(labelTemplate) {
      log.debug('set scripted field Url Label Template = ' + labelTemplate);
      const urlEditorLabelTemplate = await find.byCssSelector(
        'input[data-test-subj="urlEditorLabelTemplate"]'
      );
      await urlEditorLabelTemplate.type(labelTemplate);
    }

    async setScriptedFieldDatePattern(datePattern) {
      log.debug('set scripted field Date Pattern = ' + datePattern);
      const datePatternField = await find.byCssSelector(
        'input[data-test-subj="dateEditorPattern"]'
      );
      await datePatternField.clearValue();
      await datePatternField.type(datePattern);
    }

    async setScriptedFieldStringTransform(stringTransform) {
      log.debug('set scripted field string Transform = ' + stringTransform);
      await find.clickByCssSelector(
        'select[data-test-subj="stringEditorTransform"] > option[value="' + stringTransform + '"]'
      );
    }

    async setScriptedFieldPopularity(popularity) {
      log.debug('set scripted field popularity = ' + popularity);
      const field = await testSubjects.find('editorFieldCount');
      await field.clearValue();
      await field.type(popularity);
    }

    async setScriptedFieldScript(script) {
      log.debug('set scripted field script = ' + script);
      const field = await testSubjects.find('editorFieldScript');
      await field.clearValue();
      await field.type(script);
    }

    async openScriptedFieldHelp(activeTab) {
      log.debug('open Scripted Fields help');
      let isOpen = await testSubjects.exists('scriptedFieldsHelpFlyout');
      if (!isOpen) {
        await retry.try(async () => {
          await testSubjects.click('scriptedFieldsHelpLink');
          isOpen = await testSubjects.exists('scriptedFieldsHelpFlyout');
          if (!isOpen) {
            throw new Error('Failed to open scripted fields help');
          }
        });
      }

      if (activeTab) {
        await testSubjects.click(activeTab);
      }
    }

    async closeScriptedFieldHelp() {
      await flyout.ensureClosed('scriptedFieldsHelpFlyout');
    }

    async executeScriptedField(script, additionalField) {
      log.debug('execute Scripted Fields help');
      await this.closeScriptedFieldHelp(); // ensure script help is closed so script input is not blocked
      await this.setScriptedFieldScript(script);
      await this.openScriptedFieldHelp('testTab');
      if (additionalField) {
        await comboBox.set('additionalFieldsSelect', additionalField);
        await testSubjects.click('runScriptButton');
      }
      let scriptResults;
      await retry.try(async () => {
        scriptResults = await testSubjects.getVisibleText('scriptedFieldPreview');
      });
      return scriptResults;
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

    async clickConfirmChanges() {
      await testSubjects.click('importSavedObjectsConfirmBtn');
    }

    async associateIndexPattern(oldIndexPatternId, newIndexPatternTitle) {
      await find.clickByCssSelector(
        `select[data-test-subj="managementChangeIndexSelection-${oldIndexPatternId}"] >
        [data-test-subj="indexPatternOption-${newIndexPatternTitle}"]`
      );
    }

    async clickChangeIndexConfirmButton() {
      await testSubjects.click('changeIndexConfirmButton');
    }

    async waitUntilSavedObjectsTableIsNotLoading() {
      return retry.try(async () => {
        const exists = await find.existsByDisplayedByCssSelector(
          '*[data-test-subj="savedObjectsTable"] .euiBasicTable-loading'
        );
        if (exists) {
          throw new Error('Waiting');
        }
        return true;
      });
    }

    async getSavedObjectsInTable() {
      const table = await testSubjects.find('savedObjectsTable');
      const cells = await table.findAllByCssSelector('td:nth-child(3)');

      const objects = [];
      for (const cell of cells) {
        objects.push(await cell.getVisibleText());
      }

      return objects;
    }
  }

  return new SettingsPage();
}
