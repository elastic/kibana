/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';
import { OPTIONS_LIST_CONTROL, ControlWidth } from '../../../src/plugins/controls/common';

import { FtrService } from '../ftr_provider_context';

export class DashboardPageControls extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly find = this.ctx.getService('find');
  private readonly retry = this.ctx.getService('retry');
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');
  private readonly settings = this.ctx.getPageObject('settings');
  private readonly testSubjects = this.ctx.getService('testSubjects');

  /* -----------------------------------------------------------
     General controls functions
     ----------------------------------------------------------- */

  public async enableControlsLab() {
    await this.header.clickStackManagement();
    await this.settings.clickKibanaSettings();
    await this.settings.toggleAdvancedSettingCheckbox('labs:dashboard:dashboardControls');
  }

  public async expectControlsEmpty() {
    await this.testSubjects.existOrFail('controls-empty');
  }

  public async getAllControlIds() {
    const controlFrames = await this.testSubjects.findAll('control-frame');
    const ids = await Promise.all(
      controlFrames.map(async (controlFrame) => await controlFrame.getAttribute('data-control-id'))
    );
    this.log.debug('Got all control ids:', ids);
    return ids;
  }

  public async getAllControlTitles() {
    const titleObjects = await this.testSubjects.findAll('control-frame-title');
    const titles = await Promise.all(
      titleObjects.map(async (title) => (await title.getVisibleText()).split('\n')[0])
    );
    this.log.debug('Got all control titles:', titles);
    return titles;
  }

  public async doesControlTitleExist(title: string) {
    const titles = await this.getAllControlTitles();
    return Boolean(titles.find((currentTitle) => currentTitle.indexOf(title)));
  }

  public async getControlsCount() {
    const allTitles = await this.getAllControlTitles();
    return allTitles.length;
  }

  public async openCreateControlFlyout(type: string) {
    this.log.debug(`Opening flyout for ${type} control`);
    await this.testSubjects.click('dashboard-controls-menu-button');
    await this.testSubjects.click(`create-${type}-control`);
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail('control-editor-flyout');
    });
  }

  /* -----------------------------------------------------------
     Control group editor flyout
     ----------------------------------------------------------- */

  public async openControlGroupSettingsFlyout() {
    this.log.debug('Open controls group settings flyout');
    await this.testSubjects.click('dashboard-controls-menu-button');
    await this.testSubjects.click('controls-settings-button');
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail('control-group-settings-flyout');
    });
  }

  public async deleteAllControls() {
    this.log.debug('Delete all controls');
    if ((await this.getControlsCount()) === 0) return;

    await this.openControlGroupSettingsFlyout();
    await this.testSubjects.click('delete-all-controls-button');
    await this.testSubjects.click('confirmModalConfirmButton');
    expect(await this.getControlsCount()).to.be(0);
  }

  public async adjustControlsLayout(layout: 'oneLine' | 'twoLine') {
    this.log.debug(`Adjust controls layout to "${layout}"`);
    await this.openControlGroupSettingsFlyout();
    await this.testSubjects.existOrFail('control-group-layout-options');
    await this.testSubjects.click(`control-editor-layout-${layout}`);
    await this.testSubjects.click('control-group-editor-save');
  }

  public async updateControlsSize(width: ControlWidth, applyToAll: boolean = false) {
    this.log.debug(
      `Update default control size to ${width}`,
      applyToAll ? ' for all controls' : ''
    );
    await this.openControlGroupSettingsFlyout();
    await this.testSubjects.existOrFail('control-group-default-size-options');
    await this.testSubjects.click(`control-editor-width-${width}`);
    if (applyToAll) {
      const checkbox = await this.find.byXPath('//label[@for="editControls_setAllSizesCheckbox"]');
      await checkbox.click();
    }
    await this.testSubjects.click('control-group-editor-save');
  }

  /* -----------------------------------------------------------
     Individual controls functions
     ----------------------------------------------------------- */

  // Control Frame functions
  public async getControlElementById(controlId: string): Promise<WebElementWrapper> {
    const errorText = `Control frame ${controlId} could not be found`;
    let controlElement: WebElementWrapper | undefined;
    await this.retry.try(async () => {
      const controlFrames = await this.testSubjects.findAll('control-frame');
      const framesWithIds = await Promise.all(
        controlFrames.map(async (frame) => {
          const id = await frame.getAttribute('data-control-id');
          return { id, element: frame };
        })
      );
      const foundControlFrame = framesWithIds.find(({ id }) => id === controlId);
      if (!foundControlFrame) throw new Error(errorText);
      controlElement = foundControlFrame.element;
    });
    if (!controlElement) throw new Error(errorText);
    return controlElement;
  }

  public async hoverOverExistingControl(controlId: string) {
    const elementToHover = await this.getControlElementById(controlId);
    await this.retry.try(async () => {
      await elementToHover.moveMouseTo();
      await this.testSubjects.existOrFail(`control-action-${controlId}-edit`);
    });
  }

  public async editExistingControl(controlId: string) {
    this.log.debug(`Opening control editor for control: ${controlId}`);
    await this.hoverOverExistingControl(controlId);
    await this.testSubjects.click(`control-action-${controlId}-edit`);
  }

  public async removeExistingControl(controlId: string) {
    this.log.debug(`Removing control: ${controlId}`);
    await this.hoverOverExistingControl(controlId);
    await this.testSubjects.click(`control-action-${controlId}-delete`);
    await this.common.clickConfirmOnModal();
  }

  // Options list functions
  public async optionsListGetSelectionsString(controlId: string) {
    this.log.debug(`Getting selections string for Options List: ${controlId}`);
    const controlElement = await this.getControlElementById(controlId);
    return (await controlElement.getVisibleText()).split('\n')[1];
  }

  public async optionsListOpenPopover(controlId: string) {
    this.log.debug(`Opening popover for Options List: ${controlId}`);
    await this.testSubjects.click(`optionsList-control-${controlId}`);
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail(`optionsList-control-available-options`);
    });
  }

  public async optionsListEnsurePopoverIsClosed(controlId: string) {
    this.log.debug(`Opening popover for Options List: ${controlId}`);
    await this.testSubjects.click(`optionsList-control-${controlId}`);
    await this.testSubjects.waitForDeleted(`optionsList-control-available-options`);
  }

  public async optionsListPopoverAssertOpen() {
    await this.retry.try(async () => {
      if (!(await this.testSubjects.exists(`optionsList-control-available-options`))) {
        throw new Error('options list popover must be open before calling selectOption');
      }
    });
  }

  public async optionsListPopoverGetAvailableOptionsCount() {
    this.log.debug(`getting available options count from options list`);
    const availableOptions = await this.testSubjects.find(`optionsList-control-available-options`);
    return +(await availableOptions.getAttribute('data-option-count'));
  }

  public async optionsListPopoverGetAvailableOptions() {
    this.log.debug(`getting available options count from options list`);
    const availableOptions = await this.testSubjects.find(`optionsList-control-available-options`);
    return (await availableOptions.getVisibleText()).split('\n');
  }

  public async optionsListPopoverSearchForOption(search: string) {
    this.log.debug(`searching for ${search} in options list`);
    await this.optionsListPopoverAssertOpen();
    await this.testSubjects.setValue(`optionsList-control-search-input`, search);
  }

  public async optionsListPopoverClearSearch() {
    this.log.debug(`clearing search from options list`);
    await this.optionsListPopoverAssertOpen();
    await this.find.clickByCssSelector('.euiFormControlLayoutClearButton');
  }

  public async optionsListPopoverSelectOption(availableOption: string) {
    this.log.debug(`selecting ${availableOption} from options list`);
    await this.optionsListPopoverAssertOpen();
    await this.testSubjects.click(`optionsList-control-selection-${availableOption}`);
  }

  public async optionsListPopoverClearSelections() {
    this.log.debug(`clearing all selections from options list`);
    await this.optionsListPopoverAssertOpen();
    await this.testSubjects.click(`optionsList-control-clear-all-selections`);
  }

  /* -----------------------------------------------------------
     Control editor flyout
     ----------------------------------------------------------- */

  // Generic control editor functions
  public async controlEditorSetTitle(title: string) {
    this.log.debug(`Setting control title to ${title}`);
    await this.testSubjects.setValue('control-editor-title-input', title);
  }

  public async controlEditorSetWidth(width: ControlWidth) {
    this.log.debug(`Setting control width to ${width}`);
    await this.testSubjects.click(`control-editor-width-${width}`);
  }

  public async controlEditorSave() {
    this.log.debug(`Saving changes in control editor`);
    await this.testSubjects.click(`control-editor-save`);
  }

  public async controlEditorCancel() {
    this.log.debug(`Canceling changes in control editor`);
    await this.testSubjects.click(`control-editor-cancel`);
  }

  // Options List editor functions
  public async createOptionsListControl({
    dataViewTitle,
    fieldName,
    width,
    title,
  }: {
    title?: string;
    fieldName: string;
    width?: ControlWidth;
    dataViewTitle?: string;
  }) {
    this.log.debug(`Creating options list control ${title ?? fieldName}`);
    await this.openCreateControlFlyout(OPTIONS_LIST_CONTROL);

    if (dataViewTitle) await this.optionsListEditorSetDataView(dataViewTitle);
    if (fieldName) await this.optionsListEditorSetfield(fieldName);
    if (title) await this.controlEditorSetTitle(title);
    if (width) await this.controlEditorSetWidth(width);

    await this.controlEditorSave();
  }

  public async optionsListEditorSetDataView(dataViewTitle: string) {
    this.log.debug(`Setting options list data view to ${dataViewTitle}`);
    await this.testSubjects.click('open-data-view-picker');
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail('data-view-picker-title');
    });
    await this.testSubjects.click(`data-view-picker-${dataViewTitle}`);
  }

  public async optionsListEditorSetfield(fieldName: string, shouldSearch: boolean = false) {
    this.log.debug(`Setting options list field to ${fieldName}`);
    if (shouldSearch) {
      await this.testSubjects.setValue('field-search-input', fieldName);
    }
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail(`field-picker-select-${fieldName}`);
    });
    await this.testSubjects.click(`field-picker-select-${fieldName}`);
  }
}
