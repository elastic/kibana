/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import {
  OPTIONS_LIST_CONTROL,
  ControlWidth,
  RANGE_SLIDER_CONTROL,
} from '@kbn/controls-plugin/common';
import { ControlGroupChainingSystem } from '@kbn/controls-plugin/common/control_group/types';
import { WebElementWrapper } from '../services/lib/web_element_wrapper';

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

  public async clearAllControls() {
    const controlIds = await this.getAllControlIds();
    for (const controlId of controlIds) {
      await this.removeExistingControl(controlId);
    }
  }

  public async openCreateControlFlyout(type: string) {
    this.log.debug(`Opening flyout for ${type} control`);
    await this.testSubjects.click('dashboard-controls-menu-button');
    await this.testSubjects.click('controls-create-button');
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail('control-editor-flyout');
    });
    await this.testSubjects.click(`create-${type}-control`);
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

  public async updateChainingSystem(chainingSystem: ControlGroupChainingSystem) {
    this.log.debug(`Update control group chaining system to ${chainingSystem}`);
    await this.openControlGroupSettingsFlyout();
    await this.testSubjects.existOrFail('control-group-chaining');
    // currently there are only two chaining systems, so a switch is used.
    const switchStateToChainingSystem: { [key: string]: ControlGroupChainingSystem } = {
      true: 'HIERARCHICAL',
      false: 'NONE',
    };

    const switchState = await this.testSubjects.getAttribute('control-group-chaining', 'checked');
    if (chainingSystem !== switchStateToChainingSystem[switchState]) {
      await this.testSubjects.click('control-group-chaining');
    }
    await this.testSubjects.click('control-group-editor-save');
  }

  public async setSwitchState(goalState: boolean, subject: string) {
    await this.testSubjects.existOrFail(subject);
    const currentStateIsChecked =
      (await this.testSubjects.getAttribute(subject, 'aria-checked')) === 'true';
    if (currentStateIsChecked !== goalState) {
      await this.testSubjects.click(subject);
    }
    await this.retry.try(async () => {
      const stateIsChecked = (await this.testSubjects.getAttribute(subject, 'checked')) === 'true';
      expect(stateIsChecked).to.be(goalState);
    });
  }

  public async updateValidationSetting(validate: boolean) {
    this.log.debug(`Update control group validation setting to ${validate}`);
    await this.openControlGroupSettingsFlyout();
    await this.setSwitchState(validate, 'control-group-validate-selections');
    await this.testSubjects.click('control-group-editor-save');
  }

  public async updateAllQuerySyncSettings(querySync: boolean) {
    this.log.debug(`Update all control group query sync settings to ${querySync}`);
    await this.openControlGroupSettingsFlyout();
    await this.setSwitchState(querySync, 'control-group-query-sync');
    await this.testSubjects.click('control-group-editor-save');
  }

  public async ensureAdvancedQuerySyncIsOpened() {
    const advancedAccordion = await this.testSubjects.find(`control-group-query-sync-advanced`);
    const opened = await advancedAccordion.elementHasClass('euiAccordion-isOpen');
    if (!opened) {
      await this.testSubjects.click(`control-group-query-sync-advanced`);
      await this.retry.try(async () => {
        expect(await advancedAccordion.elementHasClass('euiAccordion-isOpen')).to.be(true);
      });
    }
  }

  public async updateSyncTimeRangeAdvancedSetting(syncTimeRange: boolean) {
    this.log.debug(`Update filter sync advanced setting to ${syncTimeRange}`);
    await this.openControlGroupSettingsFlyout();
    await this.ensureAdvancedQuerySyncIsOpened();
    await this.setSwitchState(syncTimeRange, 'control-group-query-sync-time-range');
    await this.testSubjects.click('control-group-editor-save');
  }

  public async updateSyncQueryAdvancedSetting(syncQuery: boolean) {
    this.log.debug(`Update filter sync advanced setting to ${syncQuery}`);
    await this.openControlGroupSettingsFlyout();
    await this.ensureAdvancedQuerySyncIsOpened();
    await this.setSwitchState(syncQuery, 'control-group-query-sync-query');
    await this.testSubjects.click('control-group-editor-save');
  }

  public async updateSyncFilterAdvancedSetting(syncFilters: boolean) {
    this.log.debug(`Update filter sync advanced setting to ${syncFilters}`);
    await this.openControlGroupSettingsFlyout();
    await this.ensureAdvancedQuerySyncIsOpened();
    await this.setSwitchState(syncFilters, 'control-group-query-sync-filters');
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

  public async clickExistingControl(controlId: string) {
    const elementToClick = await this.getControlElementById(controlId);
    await this.retry.try(async () => {
      await elementToClick.click();
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

  public async controlEditorCancel(confirm?: boolean) {
    this.log.debug(`Canceling changes in control editor`);
    await this.testSubjects.click(`control-editor-cancel`);
    if (confirm) {
      await this.common.clickConfirmOnModal();
    }
  }

  public async controlsEditorSetDataView(dataViewTitle: string) {
    this.log.debug(`Setting control data view to ${dataViewTitle}`);
    await this.testSubjects.click('open-data-view-picker');
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail('data-view-picker-title');
    });
    await this.testSubjects.click(`data-view-picker-${dataViewTitle}`);
  }

  public async controlsEditorSetfield(fieldName: string, shouldSearch: boolean = false) {
    this.log.debug(`Setting control field to ${fieldName}`);
    if (shouldSearch) {
      await this.testSubjects.setValue('field-search-input', fieldName);
    }
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail(`field-picker-select-${fieldName}`);
    });
    await this.testSubjects.click(`field-picker-select-${fieldName}`);
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

    if (dataViewTitle) await this.controlsEditorSetDataView(dataViewTitle);
    if (fieldName) await this.controlsEditorSetfield(fieldName);
    if (title) await this.controlEditorSetTitle(title);
    if (width) await this.controlEditorSetWidth(width);

    await this.controlEditorSave();
  }

  public async optionsListEditorGetCurrentDataView(openAndCloseFlyout?: boolean) {
    if (openAndCloseFlyout) {
      await this.openCreateControlFlyout(OPTIONS_LIST_CONTROL);
    }
    const dataViewName = (await this.testSubjects.find('open-data-view-picker')).getVisibleText();
    if (openAndCloseFlyout) {
      await this.controlEditorCancel(true);
    }
    return dataViewName;
  }

  // Range slider functions
  public async rangeSliderGetLowerBoundAttribute(controlId: string, attribute: string) {
    this.log.debug(`Getting range slider lower bound ${attribute} for ${controlId}`);
    return await this.testSubjects.getAttribute(
      `range-slider-control-${controlId} > rangeSlider__lowerBoundFieldNumber`,
      attribute
    );
  }
  public async rangeSliderGetUpperBoundAttribute(controlId: string, attribute: string) {
    this.log.debug(`Getting range slider upper bound ${attribute} for ${controlId}`);
    return await this.testSubjects.getAttribute(
      `range-slider-control-${controlId} > rangeSlider__upperBoundFieldNumber`,
      attribute
    );
  }
  public async rangeSliderGetDualRangeAttribute(controlId: string, attribute: string) {
    this.log.debug(`Getting range slider dual range ${attribute} for ${controlId}`);
    return await this.testSubjects.getAttribute(`rangeSlider__slider`, attribute);
  }
  public async rangeSliderSetLowerBound(controlId: string, value: string) {
    this.log.debug(`Setting range slider lower bound to ${value}`);
    await this.testSubjects.setValue(
      `range-slider-control-${controlId} > rangeSlider__lowerBoundFieldNumber`,
      value
    );
  }
  public async rangeSliderSetUpperBound(controlId: string, value: string) {
    this.log.debug(`Setting range slider lower bound to ${value}`);
    await this.testSubjects.setValue(
      `range-slider-control-${controlId} > rangeSlider__upperBoundFieldNumber`,
      value
    );
  }

  public async rangeSliderOpenPopover(controlId: string) {
    this.log.debug(`Opening popover for Range Slider: ${controlId}`);
    await this.testSubjects.click(`range-slider-control-${controlId}`);
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail(`rangeSlider-control-actions`);
    });
  }

  public async rangeSliderEnsurePopoverIsClosed(controlId: string) {
    this.log.debug(`Opening popover for Range Slider: ${controlId}`);
    await this.testSubjects.click(`range-slider-control-${controlId}`);
    await this.testSubjects.waitForDeleted(`rangeSlider-control-actions`);
  }

  public async rangeSliderPopoverAssertOpen() {
    await this.retry.try(async () => {
      if (!(await this.testSubjects.exists(`rangeSlider-control-actions`))) {
        throw new Error('options list popover must be open before calling selectOption');
      }
    });
  }

  public async rangeSliderWaitForLoading() {
    await this.testSubjects.waitForDeleted('range-slider-loading-spinner');
  }

  public async rangeSliderClearSelection(controlId: string) {
    this.log.debug(`Clearing range slider selection from control: ${controlId}`);
    await this.rangeSliderOpenPopover(controlId);
    await this.rangeSliderPopoverAssertOpen();
    await this.testSubjects.click('rangeSlider__clearRangeButton');
  }

  // Range slider editor functions
  public async createRangeSliderControl({
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
    this.log.debug(`Creating range slider control ${title ?? fieldName}`);
    await this.openCreateControlFlyout(RANGE_SLIDER_CONTROL);

    if (dataViewTitle) await this.controlsEditorSetDataView(dataViewTitle);
    if (fieldName) await this.controlsEditorSetfield(fieldName);
    if (title) await this.controlEditorSetTitle(title);
    if (width) await this.controlEditorSetWidth(width);

    await this.controlEditorSave();
  }
}
