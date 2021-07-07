/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { map as mapAsync } from 'bluebird';
import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class SettingsPageObject extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');
  private readonly find = this.ctx.getService('find');
  private readonly flyout = this.ctx.getService('flyout');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly comboBox = this.ctx.getService('comboBox');
  private readonly header = this.ctx.getPageObject('header');
  private readonly common = this.ctx.getPageObject('common');
  private readonly savedObjects = this.ctx.getPageObject('savedObjects');

  async clickNavigation() {
    await this.find.clickDisplayedByCssSelector('.app-link:nth-child(5) a');
  }

  async clickLinkText(text: string) {
    await this.find.clickByDisplayedLinkText(text);
  }

  async clickKibanaSettings() {
    await this.testSubjects.click('settings');
    await this.header.waitUntilLoadingHasFinished();
    await this.testSubjects.existOrFail('managementSettingsTitle');
  }

  async clickKibanaSavedObjects() {
    await this.testSubjects.click('objects');
    await this.savedObjects.waitTableIsLoaded();
  }

  async clickKibanaIndexPatterns() {
    this.log.debug('clickKibanaIndexPatterns link');
    await this.testSubjects.click('indexPatterns');

    await this.header.waitUntilLoadingHasFinished();
  }

  async getAdvancedSettings(propertyName: string) {
    this.log.debug('in getAdvancedSettings');
    return await this.testSubjects.getAttribute(
      `advancedSetting-editField-${propertyName}`,
      'value'
    );
  }

  async expectDisabledAdvancedSetting(propertyName: string) {
    expect(
      await this.testSubjects.getAttribute(`advancedSetting-editField-${propertyName}`, 'disabled')
    ).to.eql('true');
  }

  async getAdvancedSettingCheckbox(propertyName: string) {
    this.log.debug('in getAdvancedSettingCheckbox');
    return await this.testSubjects.getAttribute(
      `advancedSetting-editField-${propertyName}`,
      'checked'
    );
  }

  async clearAdvancedSettings(propertyName: string) {
    await this.testSubjects.click(`advancedSetting-resetField-${propertyName}`);
    await this.header.waitUntilLoadingHasFinished();
    await this.testSubjects.click(`advancedSetting-saveButton`);
    await this.header.waitUntilLoadingHasFinished();
  }

  async setAdvancedSettingsSelect(propertyName: string, propertyValue: string) {
    await this.find.clickByCssSelector(
      `[data-test-subj="advancedSetting-editField-${propertyName}"] option[value="${propertyValue}"]`
    );
    await this.header.waitUntilLoadingHasFinished();
    await this.testSubjects.click(`advancedSetting-saveButton`);
    await this.header.waitUntilLoadingHasFinished();
  }

  async setAdvancedSettingsInput(propertyName: string, propertyValue: string) {
    const input = await this.testSubjects.find(`advancedSetting-editField-${propertyName}`);
    await input.clearValue();
    await input.type(propertyValue);
    await this.testSubjects.click(`advancedSetting-saveButton`);
    await this.header.waitUntilLoadingHasFinished();
  }

  async setAdvancedSettingsTextArea(propertyName: string, propertyValue: string) {
    const wrapper = await this.testSubjects.find(`advancedSetting-editField-${propertyName}`);
    const textarea = await wrapper.findByTagName('textarea');
    await textarea.focus();
    // only way to properly replace the value of the ace editor is via the JS api
    await this.browser.execute(
      (editor: string, value: string) => {
        return (window as any).ace.edit(editor).setValue(value);
      },
      `advancedSetting-editField-${propertyName}-editor`,
      propertyValue
    );
    await this.testSubjects.click(`advancedSetting-saveButton`);
    await this.header.waitUntilLoadingHasFinished();
  }

  async toggleAdvancedSettingCheckbox(propertyName: string) {
    await this.testSubjects.click(`advancedSetting-editField-${propertyName}`);
    await this.header.waitUntilLoadingHasFinished();
    await this.testSubjects.click(`advancedSetting-saveButton`);
    await this.header.waitUntilLoadingHasFinished();
  }

  async navigateTo() {
    await this.common.navigateToApp('settings');
  }

  async getIndexPatternField() {
    return await this.testSubjects.find('createIndexPatternNameInput');
  }

  async clickTimeFieldNameField() {
    return await this.testSubjects.click('createIndexPatternTimeFieldSelect');
  }

  async getTimeFieldNameField() {
    return await this.testSubjects.find('createIndexPatternTimeFieldSelect');
  }

  async selectTimeFieldOption(selection: string) {
    // open dropdown
    await this.clickTimeFieldNameField();
    // close dropdown, keep focus
    await this.clickTimeFieldNameField();
    await this.header.waitUntilLoadingHasFinished();
    return await this.retry.try(async () => {
      this.log.debug(`selectTimeFieldOption(${selection})`);
      const timeFieldOption = await this.getTimeFieldOption(selection);
      await timeFieldOption.click();
      const selected = await timeFieldOption.isSelected();
      if (!selected) throw new Error('option not selected: ' + selected);
    });
  }

  async getTimeFieldOption(selection: string) {
    return await this.find.displayedByCssSelector('option[value="' + selection + '"]');
  }

  async getCreateIndexPatternButton() {
    return await this.testSubjects.find('createIndexPatternButton');
  }

  async getCreateButton() {
    return await this.find.displayedByCssSelector('[type="submit"]');
  }

  async clickDefaultIndexButton() {
    await this.testSubjects.click('setDefaultIndexPatternButton');
    await this.header.waitUntilLoadingHasFinished();
  }

  async clickDeletePattern() {
    await this.testSubjects.click('deleteIndexPatternButton');
  }

  async getIndexPageHeading() {
    return await this.testSubjects.getVisibleText('indexPatternTitle');
  }

  async getConfigureHeader() {
    return await this.find.byCssSelector('h1');
  }

  async getTableHeader() {
    return await this.find.allByCssSelector('table.euiTable thead tr th');
  }

  async sortBy(columnName: string) {
    const chartTypes = await this.find.allByCssSelector('table.euiTable thead tr th button');

    const getChartType = async (chart: Record<string, any>) => {
      const chartString = await chart.getVisibleText();
      if (chartString === columnName) {
        await chart.click();
        await this.header.waitUntilLoadingHasFinished();
      }
    };

    const getChartTypesPromises = chartTypes.map(getChartType);
    return Promise.all(getChartTypesPromises);
  }

  async getTableRow(rowNumber: number, colNumber: number) {
    // passing in zero-based index, but adding 1 for css 1-based indexes
    return await this.find.byCssSelector(
      'table.euiTable tbody tr:nth-child(' +
        (rowNumber + 1) +
        ') td.euiTableRowCell:nth-child(' +
        (colNumber + 1) +
        ')'
    );
  }

  async getFieldsTabCount() {
    return this.retry.try(async () => {
      const text = await this.testSubjects.getVisibleText('tab-indexedFields');
      return text.split(' ')[1].replace(/\((.*)\)/, '$1');
    });
  }

  async getScriptedFieldsTabCount() {
    return await this.retry.try(async () => {
      const text = await this.testSubjects.getVisibleText('tab-scriptedFields');
      return text.split(' ')[2].replace(/\((.*)\)/, '$1');
    });
  }

  async getFieldNames() {
    const fieldNameCells = await this.testSubjects.findAll('editIndexPattern > indexedFieldName');
    return await mapAsync(fieldNameCells, async (cell) => {
      return (await cell.getVisibleText()).trim();
    });
  }

  async getFieldTypes() {
    const fieldNameCells = await this.testSubjects.findAll('editIndexPattern > indexedFieldType');
    return await mapAsync(fieldNameCells, async (cell) => {
      return (await cell.getVisibleText()).trim();
    });
  }

  async getScriptedFieldLangs() {
    const fieldNameCells = await this.testSubjects.findAll('editIndexPattern > scriptedFieldLang');
    return await mapAsync(fieldNameCells, async (cell) => {
      return (await cell.getVisibleText()).trim();
    });
  }

  async setFieldTypeFilter(type: string) {
    await this.find.clickByCssSelector(
      'select[data-test-subj="indexedFieldTypeFilterDropdown"] > option[value="' + type + '"]'
    );
  }

  async setScriptedFieldLanguageFilter(language: string) {
    await this.find.clickByCssSelector(
      'select[data-test-subj="scriptedFieldLanguageFilterDropdown"] > option[value="' +
        language +
        '"]'
    );
  }

  async filterField(name: string) {
    const input = await this.testSubjects.find('indexPatternFieldFilter');
    await input.clearValue();
    await input.type(name);
  }

  async openControlsByName(name: string) {
    await this.filterField(name);
    const tableFields = await (
      await this.find.byCssSelector(
        'table.euiTable tbody tr.euiTableRow td.euiTableRowCell:first-child'
      )
    ).getVisibleText();

    await this.find.clickByCssSelector(
      `table.euiTable tbody tr.euiTableRow:nth-child(${tableFields.indexOf(name) + 1})
        td:nth-last-child(2) button`
    );
  }

  async increasePopularity() {
    await this.testSubjects.setValue('editorFieldCount', '1', { clearWithKeyboard: true });
  }

  async getPopularity() {
    return await this.testSubjects.getAttribute('editorFieldCount', 'value');
  }

  async controlChangeCancel() {
    await this.testSubjects.click('fieldCancelButton');
    await this.header.waitUntilLoadingHasFinished();
  }

  async controlChangeSave() {
    await this.testSubjects.click('fieldSaveButton');
    await this.header.waitUntilLoadingHasFinished();
  }

  async hasIndexPattern(name: string) {
    return await this.find.existsByLinkText(name);
  }

  async clickIndexPatternByName(name: string) {
    const indexLink = await this.find.byXPath(`//a[descendant::*[text()='${name}']]`);
    await indexLink.click();
  }

  async clickIndexPatternLogstash() {
    await this.clickIndexPatternByName('logstash-*');
  }

  async getIndexPatternList() {
    await this.testSubjects.existOrFail('indexPatternTable', { timeout: 5000 });
    return await this.find.allByCssSelector(
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
    return !(await this.testSubjects.exists('indexPatternTable', { timeout: 5000 }));
  }

  async removeLogstashIndexPatternIfExist() {
    if (!(await this.isIndexPatternListEmpty())) {
      await this.clickIndexPatternLogstash();
      await this.removeIndexPattern();
    }
  }

  async createIndexPattern(
    indexPatternName: string,
    // null to bypass default value
    timefield: string | null = '@timestamp',
    isStandardIndexPattern = true
  ) {
    await this.retry.try(async () => {
      await this.header.waitUntilLoadingHasFinished();
      await this.clickKibanaIndexPatterns();
      const exists = await this.hasIndexPattern(indexPatternName);

      if (exists) {
        await this.clickIndexPatternByName(indexPatternName);
        return;
      }

      await this.header.waitUntilLoadingHasFinished();
      await this.clickAddNewIndexPatternButton();
      if (!isStandardIndexPattern) {
        await this.clickCreateNewRollupButton();
      }
      await this.header.waitUntilLoadingHasFinished();
      await this.retry.try(async () => {
        await this.setIndexPatternField(indexPatternName);
      });

      const btn = await this.getCreateIndexPatternGoToStep2Button();
      await this.retry.waitFor(`index pattern Go To Step 2 button to be enabled`, async () => {
        return await btn.isEnabled();
      });
      await btn.click();

      await this.common.sleep(2000);
      if (timefield) {
        await this.selectTimeFieldOption(timefield);
      }
      await (await this.getCreateIndexPatternButton()).click();
    });
    await this.header.waitUntilLoadingHasFinished();
    await this.retry.try(async () => {
      const currentUrl = await this.browser.getCurrentUrl();
      this.log.info('currentUrl', currentUrl);
      if (!currentUrl.match(/indexPatterns\/.+\?/)) {
        throw new Error('Index pattern not created');
      } else {
        this.log.debug('Index pattern created: ' + currentUrl);
      }
    });

    return await this.getIndexPatternIdFromUrl();
  }

  async clickAddNewIndexPatternButton() {
    await this.common.scrollKibanaBodyTop();
    await this.testSubjects.click('createIndexPatternButton');
  }

  async clickCreateNewRollupButton() {
    await this.testSubjects.click('createRollupIndexPatternButton');
  }

  async getIndexPatternIdFromUrl() {
    const currentUrl = await this.browser.getCurrentUrl();
    const indexPatternId = currentUrl.match(/.*\/(.*)/)![1];

    this.log.debug('index pattern ID: ', indexPatternId);

    return indexPatternId;
  }

  async setIndexPatternField(indexPatternName = 'logstash-*') {
    this.log.debug(`setIndexPatternField(${indexPatternName})`);
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
        await field.type(this.browser.keys.DELETE, { charByChar: true });
      }
    }
    const currentName = await field.getAttribute('value');
    this.log.debug(`setIndexPatternField set to ${currentName}`);
    expect(currentName).to.eql(indexPatternName);
  }

  async getCreateIndexPatternGoToStep2Button() {
    return await this.testSubjects.find('createIndexPatternGoToStep2Button');
  }

  async removeIndexPattern() {
    let alertText;
    await this.retry.try(async () => {
      this.log.debug('click delete index pattern button');
      await this.clickDeletePattern();
    });
    await this.retry.try(async () => {
      this.log.debug('getAlertText');
      alertText = await this.testSubjects.getVisibleText('confirmModalTitleText');
    });
    await this.retry.try(async () => {
      this.log.debug('acceptConfirmation');
      await this.testSubjects.click('confirmModalConfirmButton');
    });
    await this.retry.try(async () => {
      const currentUrl = await this.browser.getCurrentUrl();
      if (currentUrl.match(/index_patterns\/.+\?/)) {
        throw new Error('Index pattern not removed');
      }
    });
    return alertText;
  }

  async clickFieldsTab() {
    this.log.debug('click Fields tab');
    await this.testSubjects.click('tab-indexedFields');
  }

  async clickScriptedFieldsTab() {
    this.log.debug('click Scripted Fields tab');
    await this.testSubjects.click('tab-scriptedFields');
  }

  async clickSourceFiltersTab() {
    this.log.debug('click Source Filters tab');
    await this.testSubjects.click('tab-sourceFilters');
  }

  async editScriptedField(name: string) {
    await this.filterField(name);
    await this.find.clickByCssSelector('.euiTableRowCell--hasActions button:first-child');
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

  async addRuntimeField(name: string, type: string, script: string) {
    await this.clickAddField();
    await this.setFieldName(name);
    await this.setFieldType(type);
    if (script) {
      await this.setFieldScript(script);
    }
    await this.clickSaveField();
    await this.closeIndexPatternFieldEditor();
  }

  public async confirmSave() {
    await this.testSubjects.setValue('saveModalConfirmText', 'change');
    await this.testSubjects.click('confirmModalConfirmButton');
  }

  public async confirmDelete() {
    await this.testSubjects.setValue('deleteModalConfirmText', 'remove');
    await this.testSubjects.click('confirmModalConfirmButton');
  }

  async closeIndexPatternFieldEditor() {
    await this.retry.waitFor('field editor flyout to close', async () => {
      return !(await this.testSubjects.exists('euiFlyoutCloseButton'));
    });
  }

  async clickAddField() {
    this.log.debug('click Add Field');
    await this.testSubjects.click('addField');
  }

  async clickSaveField() {
    this.log.debug('click Save');
    await this.testSubjects.click('fieldSaveButton');
  }

  async setFieldName(name: string) {
    this.log.debug('set field name = ' + name);
    await this.testSubjects.setValue('nameField', name);
  }

  async setFieldType(type: string) {
    this.log.debug('set type = ' + type);
    await this.testSubjects.setValue('typeField', type);
  }

  async setFieldScript(script: string) {
    this.log.debug('set script = ' + script);
    const valueRow = await this.toggleRow('valueRow');
    const getMonacoTextArea = async () => (await valueRow.findAllByCssSelector('textarea'))[0];
    this.retry.waitFor('monaco editor is ready', async () => !!(await getMonacoTextArea()));
    const monacoTextArea = await getMonacoTextArea();
    await monacoTextArea.focus();
    this.browser.pressKeys(script);
  }

  async changeFieldScript(script: string) {
    this.log.debug('set script = ' + script);
    const valueRow = await this.testSubjects.find('valueRow');
    const getMonacoTextArea = async () => (await valueRow.findAllByCssSelector('textarea'))[0];
    this.retry.waitFor('monaco editor is ready', async () => !!(await getMonacoTextArea()));
    const monacoTextArea = await getMonacoTextArea();
    await monacoTextArea.focus();
    this.browser.pressKeys(this.browser.keys.DELETE.repeat(30));
    this.browser.pressKeys(script);
  }

  async clickAddScriptedField() {
    this.log.debug('click Add Scripted Field');
    await this.testSubjects.click('addScriptedFieldLink');
  }

  async clickSaveScriptedField() {
    this.log.debug('click Save Scripted Field');
    await this.testSubjects.click('fieldSaveButton');
    await this.header.waitUntilLoadingHasFinished();
  }

  async setScriptedFieldName(name: string) {
    this.log.debug('set scripted field name = ' + name);
    await this.testSubjects.setValue('editorFieldName', name);
  }

  async setScriptedFieldLanguage(language: string) {
    this.log.debug('set scripted field language = ' + language);
    await this.find.clickByCssSelector(
      'select[data-test-subj="editorFieldLang"] > option[value="' + language + '"]'
    );
  }

  async setScriptedFieldType(type: string) {
    this.log.debug('set scripted field type = ' + type);
    await this.find.clickByCssSelector(
      'select[data-test-subj="editorFieldType"] > option[value="' + type + '"]'
    );
  }

  async setFieldFormat(format: string) {
    this.log.debug('set scripted field format = ' + format);
    await this.find.clickByCssSelector(
      'select[data-test-subj="editorSelectedFormatId"] > option[value="' + format + '"]'
    );
  }

  async toggleRow(rowTestSubj: string) {
    this.log.debug('toggling tow = ' + rowTestSubj);
    const row = await this.testSubjects.find(rowTestSubj);
    const rowToggle = (await row.findAllByCssSelector('[data-test-subj="toggle"]'))[0];
    await rowToggle.click();
    return row;
  }

  async setCustomLabel(label: string) {
    this.log.debug('set custom label = ' + label);
    await (
      await this.testSubjects.findDescendant(
        'input',
        await this.testSubjects.find('customLabelRow')
      )
    ).type(label);
  }

  async setScriptedFieldUrlType(type: string) {
    this.log.debug('set scripted field Url type = ' + type);
    await this.find.clickByCssSelector(
      'select[data-test-subj="urlEditorType"] > option[value="' + type + '"]'
    );
  }

  async setScriptedFieldUrlTemplate(template: string) {
    this.log.debug('set scripted field Url Template = ' + template);
    const urlTemplateField = await this.find.byCssSelector(
      'input[data-test-subj="urlEditorUrlTemplate"]'
    );
    await urlTemplateField.type(template);
  }

  async setScriptedFieldUrlLabelTemplate(labelTemplate: string) {
    this.log.debug('set scripted field Url Label Template = ' + labelTemplate);
    const urlEditorLabelTemplate = await this.find.byCssSelector(
      'input[data-test-subj="urlEditorLabelTemplate"]'
    );
    await urlEditorLabelTemplate.type(labelTemplate);
  }

  async setScriptedFieldDatePattern(datePattern: string) {
    this.log.debug('set scripted field Date Pattern = ' + datePattern);
    const datePatternField = await this.find.byCssSelector(
      'input[data-test-subj="dateEditorPattern"]'
    );
    // clearValue does not work here
    // Send Backspace event for each char in value string to clear field
    await datePatternField.clearValueWithKeyboard({ charByChar: true });
    await datePatternField.type(datePattern);
  }

  async setScriptedFieldStringTransform(stringTransform: string) {
    this.log.debug('set scripted field string Transform = ' + stringTransform);
    await this.find.clickByCssSelector(
      'select[data-test-subj="stringEditorTransform"] > option[value="' + stringTransform + '"]'
    );
  }

  async setScriptedFieldPopularity(popularity: string) {
    this.log.debug('set scripted field popularity = ' + popularity);
    await this.testSubjects.setValue('editorFieldCount', popularity);
  }

  async setScriptedFieldScript(script: string) {
    this.log.debug('set scripted field script = ' + script);
    const aceEditorCssSelector = '[data-test-subj="editorFieldScript"] .ace_editor';
    const editor = await this.find.byCssSelector(aceEditorCssSelector);
    await editor.click();
    const existingText = await editor.getVisibleText();
    for (let i = 0; i < existingText.length; i++) {
      await this.browser.pressKeys(this.browser.keys.BACK_SPACE);
    }
    await this.browser.pressKeys(...script.split(''));
  }

  async openScriptedFieldHelp(activeTab: string) {
    this.log.debug('open Scripted Fields help');
    let isOpen = await this.testSubjects.exists('scriptedFieldsHelpFlyout');
    if (!isOpen) {
      await this.retry.try(async () => {
        await this.testSubjects.click('scriptedFieldsHelpLink');
        isOpen = await this.testSubjects.exists('scriptedFieldsHelpFlyout');
        if (!isOpen) {
          throw new Error('Failed to open scripted fields help');
        }
      });
    }

    if (activeTab) {
      await this.testSubjects.click(activeTab);
    }
  }

  async closeScriptedFieldHelp() {
    await this.flyout.ensureClosed('scriptedFieldsHelpFlyout');
  }

  async executeScriptedField(script: string, additionalField: string) {
    this.log.debug('execute Scripted Fields help');
    await this.closeScriptedFieldHelp(); // ensure script help is closed so script input is not blocked
    await this.setScriptedFieldScript(script);
    await this.openScriptedFieldHelp('testTab');
    if (additionalField) {
      await this.comboBox.set('additionalFieldsSelect', additionalField);
      await this.testSubjects.find('scriptedFieldPreview');
      await this.testSubjects.click('runScriptButton');
      await this.testSubjects.waitForDeleted('.euiLoadingSpinner');
    }
    let scriptResults;
    await this.retry.try(async () => {
      scriptResults = await this.testSubjects.getVisibleText('scriptedFieldPreview');
    });
    return scriptResults;
  }

  async clickEditFieldFormat() {
    await this.testSubjects.click('editFieldFormat');
  }

  async clickCloseEditFieldFormatFlyout() {
    await this.testSubjects.click('euiFlyoutCloseButton');
  }

  async associateIndexPattern(oldIndexPatternId: string, newIndexPatternTitle: string) {
    await this.find.clickByCssSelector(
      `select[data-test-subj="managementChangeIndexSelection-${oldIndexPatternId}"] >
      [data-test-subj="indexPatternOption-${newIndexPatternTitle}"]`
    );
  }

  async clickChangeIndexConfirmButton() {
    await this.testSubjects.click('changeIndexConfirmButton');
  }
}
