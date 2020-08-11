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
import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SettingsPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const browser = getService('browser');
  const find = getService('find');
  const flyout = getService('flyout');
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const PageObjects = getPageObjects(['header', 'common', 'savedObjects']);

  class SettingsPage {
    async clickNavigation() {
      await find.clickDisplayedByCssSelector('.app-link:nth-child(5) a');
    }

    async clickLinkText(text: string) {
      await find.clickByDisplayedLinkText(text);
    }
    async clickKibanaSettings() {
      await testSubjects.click('settings');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('managementSettingsTitle');
    }

    async clickKibanaSavedObjects() {
      await testSubjects.click('objects');
      await PageObjects.savedObjects.waitTableIsLoaded();
    }

    async clickKibanaIndexPatterns() {
      log.debug('clickKibanaIndexPatterns link');
      await testSubjects.click('indexPatterns');

      await PageObjects.header.waitUntilLoadingHasFinished();

      // check for the index pattern info flyout that covers the
      // create index pattern button on smaller screens
      // @ts-ignore
      await retry.waitFor('index pattern info flyout', async () => {
        if (await testSubjects.exists('CreateIndexPatternPrompt')) {
          await testSubjects.click('CreateIndexPatternPrompt > euiFlyoutCloseButton');
        } else return true;
      });
    }

    async getAdvancedSettings(propertyName: string) {
      log.debug('in getAdvancedSettings');
      return await testSubjects.getAttribute(`advancedSetting-editField-${propertyName}`, 'value');
    }

    async expectDisabledAdvancedSetting(propertyName: string) {
      expect(
        await testSubjects.getAttribute(`advancedSetting-editField-${propertyName}`, 'disabled')
      ).to.eql('true');
    }

    async getAdvancedSettingCheckbox(propertyName: string) {
      log.debug('in getAdvancedSettingCheckbox');
      return await testSubjects.getAttribute(
        `advancedSetting-editField-${propertyName}`,
        'checked'
      );
    }

    async clearAdvancedSettings(propertyName: string) {
      await testSubjects.click(`advancedSetting-resetField-${propertyName}`);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click(`advancedSetting-saveButton`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async setAdvancedSettingsSelect(propertyName: string, propertyValue: string) {
      await find.clickByCssSelector(
        `[data-test-subj="advancedSetting-editField-${propertyName}"] option[value="${propertyValue}"]`
      );
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click(`advancedSetting-saveButton`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async setAdvancedSettingsInput(propertyName: string, propertyValue: string) {
      const input = await testSubjects.find(`advancedSetting-editField-${propertyName}`);
      await input.clearValue();
      await input.type(propertyValue);
      await testSubjects.click(`advancedSetting-saveButton`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async toggleAdvancedSettingCheckbox(propertyName: string) {
      await testSubjects.click(`advancedSetting-editField-${propertyName}`);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click(`advancedSetting-saveButton`);
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

    async selectTimeFieldOption(selection: string) {
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

    async getTimeFieldOption(selection: string) {
      return await find.displayedByCssSelector('option[value="' + selection + '"]');
    }

    async getCreateIndexPatternButton() {
      return await testSubjects.find('createIndexPatternButton');
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
      return await testSubjects.getVisibleText('indexPatternTitle');
    }

    async getConfigureHeader() {
      return await find.byCssSelector('h1');
    }

    async getTableHeader() {
      return await find.allByCssSelector('table.euiTable thead tr th');
    }

    async sortBy(columnName: string) {
      const chartTypes = await find.allByCssSelector('table.euiTable thead tr th button');
      async function getChartType(chart: Record<string, any>) {
        const chartString = await chart.getVisibleText();
        if (chartString === columnName) {
          await chart.click();
          await PageObjects.header.waitUntilLoadingHasFinished();
        }
      }
      const getChartTypesPromises = chartTypes.map(getChartType);
      return Promise.all(getChartTypesPromises);
    }

    async getTableRow(rowNumber: number, colNumber: number) {
      // passing in zero-based index, but adding 1 for css 1-based indexes
      return await find.byCssSelector(
        'table.euiTable tbody tr:nth-child(' +
          (rowNumber + 1) +
          ') td.euiTableRowCell:nth-child(' +
          (colNumber + 1) +
          ')'
      );
    }

    async getFieldsTabCount() {
      return retry.try(async () => {
        const text = await testSubjects.getVisibleText('tab-indexedFields');
        return text.split(' ')[1].replace(/\((.*)\)/, '$1');
      });
    }

    async getScriptedFieldsTabCount() {
      return await retry.try(async () => {
        const text = await testSubjects.getVisibleText('tab-scriptedFields');
        return text.split(' ')[2].replace(/\((.*)\)/, '$1');
      });
    }

    async getFieldNames() {
      const fieldNameCells = await testSubjects.findAll('editIndexPattern > indexedFieldName');
      return await mapAsync(fieldNameCells, async (cell) => {
        return (await cell.getVisibleText()).trim();
      });
    }

    async getFieldTypes() {
      const fieldNameCells = await testSubjects.findAll('editIndexPattern > indexedFieldType');
      return await mapAsync(fieldNameCells, async (cell) => {
        return (await cell.getVisibleText()).trim();
      });
    }

    async getScriptedFieldLangs() {
      const fieldNameCells = await testSubjects.findAll('editIndexPattern > scriptedFieldLang');
      return await mapAsync(fieldNameCells, async (cell) => {
        return (await cell.getVisibleText()).trim();
      });
    }

    async setFieldTypeFilter(type: string) {
      await find.clickByCssSelector(
        'select[data-test-subj="indexedFieldTypeFilterDropdown"] > option[value="' + type + '"]'
      );
    }

    async setScriptedFieldLanguageFilter(language: string) {
      await find.clickByCssSelector(
        'select[data-test-subj="scriptedFieldLanguageFilterDropdown"] > option[value="' +
          language +
          '"]'
      );
    }

    async filterField(name: string) {
      const input = await testSubjects.find('indexPatternFieldFilter');
      await input.clearValue();
      await input.type(name);
    }

    async openControlsByName(name: string) {
      await this.filterField(name);
      const tableFields = await (
        await find.byCssSelector(
          'table.euiTable tbody tr.euiTableRow td.euiTableRowCell:first-child'
        )
      ).getVisibleText();

      await find.clickByCssSelector(
        `table.euiTable tbody tr.euiTableRow:nth-child(${tableFields.indexOf(name) + 1})
          td:last-child button`
      );
    }

    async increasePopularity() {
      await testSubjects.setValue('editorFieldCount', '1', { clearWithKeyboard: true });
    }

    async getPopularity() {
      return await testSubjects.getAttribute('editorFieldCount', 'value');
    }

    async controlChangeCancel() {
      await testSubjects.click('fieldCancelButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async controlChangeSave() {
      await testSubjects.click('fieldSaveButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickIndexPatternLogstash() {
      const indexLink = await find.byXPath(`//a[descendant::*[text()='logstash-*']]`);
      await indexLink.click();
    }

    async getIndexPatternList() {
      await testSubjects.existOrFail('indexPatternTable', { timeout: 5000 });
      return await find.allByCssSelector(
        '[data-test-subj="indexPatternTable"] .euiTable .euiTableRow'
      );
    }

    async getAllIndexPatternNames() {
      const indexPatterns = await this.getIndexPatternList();
      return await mapAsync(indexPatterns, async (index) => {
        return await index.getVisibleText();
      });
    }

    async isIndexPatternListEmpty() {
      await testSubjects.existOrFail('indexPatternTable', { timeout: 5000 });
      const indexPatternList = await this.getIndexPatternList();
      return indexPatternList.length === 0;
    }

    async removeLogstashIndexPatternIfExist() {
      if (!(await this.isIndexPatternListEmpty())) {
        await this.clickIndexPatternLogstash();
        await this.removeIndexPattern();
      }
    }

    async createIndexPattern(
      indexPatternName: string,
      timefield = '@timestamp',
      isStandardIndexPattern = true
    ) {
      await retry.try(async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();
        await this.clickKibanaIndexPatterns();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await this.clickAddNewIndexPatternButton();
        if (!isStandardIndexPattern) {
          await this.clickCreateNewRollupButton();
        }
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.try(async () => {
          await this.setIndexPatternField(indexPatternName);
        });
        await PageObjects.common.sleep(2000);
        await (await this.getCreateIndexPatternGoToStep2Button()).click();
        await PageObjects.common.sleep(2000);
        if (timefield) {
          await this.selectTimeFieldOption(timefield);
        }
        await (await this.getCreateIndexPatternButton()).click();
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await retry.try(async () => {
        const currentUrl = await browser.getCurrentUrl();
        log.info('currentUrl', currentUrl);
        if (!currentUrl.match(/indexPatterns\/.+\?/)) {
          throw new Error('Index pattern not created');
        } else {
          log.debug('Index pattern created: ' + currentUrl);
        }
      });

      return await this.getIndexPatternIdFromUrl();
    }

    async clickAddNewIndexPatternButton() {
      await testSubjects.click('createIndexPatternButton');
    }

    async clickCreateNewRollupButton() {
      await testSubjects.click('createRollupIndexPatternButton');
    }

    async getIndexPatternIdFromUrl() {
      const currentUrl = await browser.getCurrentUrl();
      const indexPatternId = currentUrl.match(/.*\/(.*)/)![1];

      log.debug('index pattern ID: ', indexPatternId);

      return indexPatternId;
    }

    async setIndexPatternField(indexPatternName = 'logstash-*') {
      log.debug(`setIndexPatternField(${indexPatternName})`);
      const field = await this.getIndexPatternField();
      await field.clearValue();
      if (
        indexPatternName.charAt(0) === '*' &&
        indexPatternName.charAt(indexPatternName.length - 1) === '*'
      ) {
        // this is a special case when the index pattern name starts with '*'
        // like '*:makelogs-*' where the UI will not append *
        await field.type(indexPatternName, { charByChar: true });
      } else if (indexPatternName.charAt(indexPatternName.length - 1) === '*') {
        // the common case where the UI will append '*' automatically so we won't type it
        const tempName = indexPatternName.slice(0, -1);
        await field.type(tempName, { charByChar: true });
      } else {
        // case where we don't want the * appended so we'll remove it if it was added
        await field.type(indexPatternName, { charByChar: true });
        const tempName = await field.getAttribute('value');
        if (tempName.length > indexPatternName.length) {
          await field.type(browser.keys.DELETE, { charByChar: true });
        }
      }
      const currentName = await field.getAttribute('value');
      log.debug(`setIndexPatternField set to ${currentName}`);
      expect(currentName).to.eql(indexPatternName);
    }

    async getCreateIndexPatternGoToStep2Button() {
      return await testSubjects.find('createIndexPatternGoToStep2Button');
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
        if (currentUrl.match(/index_patterns\/.+\?/)) {
          throw new Error('Index pattern not removed');
        }
      });
      return alertText;
    }

    async clickFieldsTab() {
      log.debug('click Fields tab');
      await testSubjects.click('tab-indexedFields');
    }

    async clickScriptedFieldsTab() {
      log.debug('click Scripted Fields tab');
      await testSubjects.click('tab-scriptedFields');
    }

    async clickSourceFiltersTab() {
      log.debug('click Source Filters tab');
      await testSubjects.click('tab-sourceFilters');
    }

    async editScriptedField(name: string) {
      await this.filterField(name);
      await find.clickByCssSelector('.euiTableRowCell--hasActions button:first-child');
    }

    async addScriptedField(
      name: string,
      language: string,
      type: string,
      format: Record<string, any>,
      popularity: string,
      script: string
    ) {
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

    async setScriptedFieldName(name: string) {
      log.debug('set scripted field name = ' + name);
      await testSubjects.setValue('editorFieldName', name);
    }

    async setScriptedFieldLanguage(language: string) {
      log.debug('set scripted field language = ' + language);
      await find.clickByCssSelector(
        'select[data-test-subj="editorFieldLang"] > option[value="' + language + '"]'
      );
    }

    async setScriptedFieldType(type: string) {
      log.debug('set scripted field type = ' + type);
      await find.clickByCssSelector(
        'select[data-test-subj="editorFieldType"] > option[value="' + type + '"]'
      );
    }

    async setFieldFormat(format: string) {
      log.debug('set scripted field format = ' + format);
      await find.clickByCssSelector(
        'select[data-test-subj="editorSelectedFormatId"] > option[value="' + format + '"]'
      );
    }

    async setScriptedFieldUrlType(type: string) {
      log.debug('set scripted field Url type = ' + type);
      await find.clickByCssSelector(
        'select[data-test-subj="urlEditorType"] > option[value="' + type + '"]'
      );
    }

    async setScriptedFieldUrlTemplate(template: string) {
      log.debug('set scripted field Url Template = ' + template);
      const urlTemplateField = await find.byCssSelector(
        'input[data-test-subj="urlEditorUrlTemplate"]'
      );
      await urlTemplateField.type(template);
    }

    async setScriptedFieldUrlLabelTemplate(labelTemplate: string) {
      log.debug('set scripted field Url Label Template = ' + labelTemplate);
      const urlEditorLabelTemplate = await find.byCssSelector(
        'input[data-test-subj="urlEditorLabelTemplate"]'
      );
      await urlEditorLabelTemplate.type(labelTemplate);
    }

    async setScriptedFieldDatePattern(datePattern: string) {
      log.debug('set scripted field Date Pattern = ' + datePattern);
      const datePatternField = await find.byCssSelector(
        'input[data-test-subj="dateEditorPattern"]'
      );
      // clearValue does not work here
      // Send Backspace event for each char in value string to clear field
      await datePatternField.clearValueWithKeyboard({ charByChar: true });
      await datePatternField.type(datePattern);
    }

    async setScriptedFieldStringTransform(stringTransform: string) {
      log.debug('set scripted field string Transform = ' + stringTransform);
      await find.clickByCssSelector(
        'select[data-test-subj="stringEditorTransform"] > option[value="' + stringTransform + '"]'
      );
    }

    async setScriptedFieldPopularity(popularity: string) {
      log.debug('set scripted field popularity = ' + popularity);
      await testSubjects.setValue('editorFieldCount', popularity);
    }

    async setScriptedFieldScript(script: string) {
      log.debug('set scripted field script = ' + script);
      const aceEditorCssSelector = '[data-test-subj="editorFieldScript"] .ace_editor';
      const editor = await find.byCssSelector(aceEditorCssSelector);
      await editor.click();
      const existingText = await editor.getVisibleText();
      for (let i = 0; i < existingText.length; i++) {
        await browser.pressKeys(browser.keys.BACK_SPACE);
      }
      await browser.pressKeys(...script.split(''));
    }

    async openScriptedFieldHelp(activeTab: string) {
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

    async executeScriptedField(script: string, additionalField: string) {
      log.debug('execute Scripted Fields help');
      await this.closeScriptedFieldHelp(); // ensure script help is closed so script input is not blocked
      await this.setScriptedFieldScript(script);
      await this.openScriptedFieldHelp('testTab');
      if (additionalField) {
        await comboBox.set('additionalFieldsSelect', additionalField);
        await testSubjects.find('scriptedFieldPreview');
        await testSubjects.click('runScriptButton');
        await testSubjects.waitForDeleted('.euiLoadingSpinner');
      }
      let scriptResults;
      await retry.try(async () => {
        scriptResults = await testSubjects.getVisibleText('scriptedFieldPreview');
      });
      return scriptResults;
    }

    async clickEditFieldFormat() {
      await testSubjects.click('editFieldFormat');
    }

    async associateIndexPattern(oldIndexPatternId: string, newIndexPatternTitle: string) {
      await find.clickByCssSelector(
        `select[data-test-subj="managementChangeIndexSelection-${oldIndexPatternId}"] >
        [data-test-subj="indexPatternOption-${newIndexPatternTitle}"]`
      );
    }

    async clickChangeIndexConfirmButton() {
      await testSubjects.click('changeIndexConfirmButton');
    }
  }

  return new SettingsPage();
}
