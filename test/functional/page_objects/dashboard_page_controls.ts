/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ControlWidth,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
} from '@kbn/controls-plugin/common';
import { ControlGroupChainingSystem } from '@kbn/controls-plugin/common/control_group/types';
import { OptionsListSearchTechnique } from '@kbn/controls-plugin/common/options_list/suggestions_searching';
import { OptionsListSortingType } from '@kbn/controls-plugin/common/options_list/suggestions_sorting';
import expect from '@kbn/expect';
import { asyncForEach } from '@kbn/std';

import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../ftr_provider_context';

interface OptionsListAdditionalSettings {
  searchTechnique?: OptionsListSearchTechnique;
  defaultSortType?: OptionsListSortingType;
  ignoreTimeout?: boolean;
  allowMultiple?: boolean;
  hideExclude?: boolean;
  hideExists?: boolean;
  hideSort?: boolean;
}

interface RangeSliderAdditionalSettings {
  step?: number;
}

export const OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS: { [key: string]: number } = {
  hiss: 5,
  ruff: 4,
  bark: 3,
  grrr: 3,
  meow: 3,
  growl: 2,
  grr: 2,
  'bow ow ow': 1,
};

export class DashboardPageControls extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly find = this.ctx.getService('find');
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');
  private readonly testSubjects = this.ctx.getService('testSubjects');

  private readonly common = this.ctx.getPageObject('common');

  /* -----------------------------------------------------------
     General controls functions
     ----------------------------------------------------------- */

  public async expectControlsEmpty() {
    await this.testSubjects.existOrFail('controls-empty');
  }

  public async getAllControlIds() {
    const controlFrames = await this.testSubjects.findAll('control-frame');
    const ids = await Promise.all(
      controlFrames.map(
        async (controlFrame) => (await controlFrame.getAttribute('data-control-id')) ?? ''
      )
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
      if (controlId) await this.removeExistingControl(controlId);
    }
  }

  public async openControlsMenu() {
    const isOpen = await this.testSubjects.exists(`controls-create-button`, { timeout: 2500 });
    if (!isOpen) {
      await this.testSubjects.click('dashboard-controls-menu-button');
    }
  }

  public async openCreateControlFlyout() {
    this.log.debug(`Opening flyout for creating a control`);
    await this.openControlsMenu();
    await this.testSubjects.click('controls-create-button');
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail('control-editor-flyout');
    });

    /** All control type options should be disabled until a field is selected */
    const controlTypeOptions = await this.find.allByCssSelector(
      '[data-test-subj="controlTypeMenu"] > li > button'
    );
    await asyncForEach(controlTypeOptions, async (controlTypeOption) => {
      expect(await controlTypeOption.isEnabled()).to.be(false);
    });
  }

  /* -----------------------------------------------------------
     Control group editor flyout
     ----------------------------------------------------------- */

  public async openControlGroupSettingsFlyout() {
    this.log.debug('Open controls group settings flyout');
    await this.openControlsMenu();
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

  public async updateChainingSystem(chainingSystem: ControlGroupChainingSystem) {
    this.log.debug(`Update control group chaining system to ${chainingSystem}`);
    await this.openControlGroupSettingsFlyout();
    await this.testSubjects.existOrFail('control-group-chaining');
    // currently there are only two chaining systems, so a switch is used.
    const switchStateToChainingSystem: { [key: string]: ControlGroupChainingSystem } = {
      true: 'HIERARCHICAL',
      false: 'NONE',
    };

    const switchState =
      (await this.testSubjects.getAttribute('control-group-chaining', 'checked')) ?? '';
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

  public async updateFilterSyncSetting(querySync: boolean) {
    this.log.debug(`Update filter sync setting to ${querySync}`);
    await this.openControlGroupSettingsFlyout();
    await this.setSwitchState(querySync, 'control-group-filter-sync');
    await this.testSubjects.click('control-group-editor-save');
  }

  public async updateTimeRangeSyncSetting(syncTimeRange: boolean) {
    this.log.debug(`Update time range sync setting to ${syncTimeRange}`);
    await this.openControlGroupSettingsFlyout();
    await this.setSwitchState(syncTimeRange, 'control-group-query-sync-time-range');
    await this.testSubjects.click('control-group-editor-save');
  }

  public async updateShowApplyButtonSetting(showApplyButton: boolean) {
    this.log.debug(`Update show apply button setting to ${showApplyButton}`);
    await this.openControlGroupSettingsFlyout();
    // the "showApplyButton" toggle has in inverse relationship with the `showApplyButton` seting - so, negate `showApplyButton`
    await this.setSwitchState(!showApplyButton, 'control-group-auto-apply-selections');
    await this.testSubjects.click('control-group-editor-save');
  }

  public async clickApplyButton() {
    this.log.debug('Clicking the apply button');
    await this.verifyApplyButtonEnabled();

    const applyButton = await this.testSubjects.find('controlGroup--applyFiltersButton');
    await applyButton.click();

    await this.verifyApplyButtonEnabled(false);
  }

  public async verifyApplyButtonEnabled(enabled: boolean = true) {
    this.log.debug(
      `Checking that control group apply button is ${enabled ? 'enabled' : 'not enabled'}`
    );
    const applyButton = await this.testSubjects.find('controlGroup--applyFiltersButton');
    await this.retry.try(async () => {
      expect(await applyButton.isEnabled()).to.be(enabled);
    });
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

  public async createControl({
    controlType,
    dataViewTitle,
    fieldName,
    grow,
    title,
    width,
    additionalSettings,
  }: {
    controlType: string;
    title?: string;
    fieldName: string;
    width?: ControlWidth;
    dataViewTitle?: string;
    grow?: boolean;
    additionalSettings?: OptionsListAdditionalSettings | RangeSliderAdditionalSettings;
  }) {
    this.log.debug(`Creating ${controlType} control ${title ?? fieldName}`);
    await this.openCreateControlFlyout();

    if (dataViewTitle) await this.controlsEditorSetDataView(dataViewTitle);
    if (fieldName) {
      await this.controlsEditorSetfield(fieldName);
      await this.controlsEditorSetControlType(controlType);
    }
    if (title) await this.controlEditorSetTitle(title);
    if (width) await this.controlEditorSetWidth(width);
    if (grow !== undefined) await this.controlEditorSetGrow(grow);

    if (additionalSettings) {
      if (controlType === OPTIONS_LIST_CONTROL) {
        await this.optionsListSetAdditionalSettings(
          additionalSettings as OptionsListAdditionalSettings
        );
      } else if (controlType === RANGE_SLIDER_CONTROL) {
        await this.rangeSliderSetAdditionalSettings(
          additionalSettings as RangeSliderAdditionalSettings
        );
      }
    }

    await this.controlEditorSave();
  }

  public async createTimeSliderControl() {
    this.log.debug(`Creating time slider control`);
    await this.openControlsMenu();
    await this.testSubjects.click('controls-create-timeslider-button');
  }

  public async hoverOverExistingControl(controlId: string) {
    const elementToHover = await this.getControlElementById(controlId);
    await this.retry.try(async () => {
      await elementToHover.moveMouseTo();
      await this.testSubjects.existOrFail(`control-action-${controlId}-delete`);
    });
  }

  public async clickExistingControl(controlId: string) {
    const elementToClick = await this.getControlElementById(controlId);
    await this.retry.try(async () => {
      await elementToClick.click();
      await this.testSubjects.existOrFail(`control-action-${controlId}-delete`);
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

  public async clearControlSelections(controlId: string) {
    this.log.debug(`clearing all selections from control ${controlId}`);
    await this.hoverOverExistingControl(controlId);
    await this.testSubjects.click(`control-action-${controlId}-erase`);
  }

  public async verifyControlType(controlId: string, expectedType: string) {
    let controlButton;
    switch (expectedType) {
      case OPTIONS_LIST_CONTROL: {
        controlButton = await this.find.byXPath(`//div[@id='controlFrame--${controlId}']//button`);
        break;
      }
      case RANGE_SLIDER_CONTROL: {
        controlButton = await this.find.byXPath(
          `//div[@id='controlFrame--${controlId}']//div[contains(@class, 'rangeSliderAnchor__button')]`
        );
        break;
      }
      default: {
        this.log.error('An invalid control type was provided.');
        break;
      }
    }

    if (controlButton) {
      const testSubj = await controlButton.getAttribute('data-test-subj');
      expect(testSubj).to.equal(`${expectedType}-${controlId}`);
    }
  }

  // Options list functions
  public async optionsListSetAdditionalSettings({
    ignoreTimeout,
    allowMultiple,
    searchTechnique,
  }: OptionsListAdditionalSettings) {
    const getSettingTestSubject = (setting: string) =>
      `optionsListControl__${setting}AdditionalSetting`;

    if (allowMultiple) await this.testSubjects.click(getSettingTestSubject('allowMultiple'));
    if (ignoreTimeout) await this.testSubjects.click(getSettingTestSubject('runPastTimeout'));
    if (searchTechnique) {
      this.log.debug(`clicking search technique: ${searchTechnique}`);
      await this.find.clickByCssSelector(
        `[data-test-subj=${getSettingTestSubject(
          `${searchTechnique}SearchOption`
        )}] label[for="${searchTechnique}"]`
      );
    }
  }

  public async optionsListGetSelectionsString(controlId: string) {
    this.log.debug(`Getting selections string for Options List: ${controlId}`);
    await this.optionsListWaitForLoading(controlId);
    const controlElement = await this.getControlElementById(controlId);
    return (await controlElement.getVisibleText()).split('\n')[1];
  }

  public async isOptionsListPopoverOpen(controlId: string) {
    const isPopoverOpen = await this.find.existsByCssSelector(`#control-popover-${controlId}`);
    this.log.debug(`Is popover open: ${isPopoverOpen} for Options List: ${controlId}`);
    return isPopoverOpen;
  }

  public async optionsListOpenPopover(controlId: string) {
    this.log.debug(`Opening popover for Options List: ${controlId}`);
    await this.retry.try(async () => {
      await this.testSubjects.click(`optionsList-control-${controlId}`);
      await this.retry.waitForWithTimeout('popover to open', 500, async () => {
        return await this.testSubjects.exists(`optionsList-control-popover`);
      });
    });
  }

  public async optionsListEnsurePopoverIsClosed(controlId: string) {
    this.log.debug(`Ensure popover is closed for Options List: ${controlId}`);
    await this.retry.try(async () => {
      const isPopoverOpen = await this.isOptionsListPopoverOpen(controlId);
      if (isPopoverOpen) {
        await this.testSubjects.click(`optionsList-control-${controlId}`);
        await this.testSubjects.waitForDeleted(`optionsList-control-available-options`);
      }
    });
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
    await this.optionsListPopoverWaitForLoading();
    const availableOptions = await this.testSubjects.find(`optionsList-control-available-options`);
    return +((await availableOptions.getAttribute('data-option-count')) ?? '0');
  }

  public async optionsListPopoverGetAvailableOptions() {
    this.log.debug(`getting available options from options list`);
    await this.optionsListPopoverWaitForLoading();
    const availableOptions = await this.testSubjects.find(`optionsList-control-available-options`);
    const optionsCount = await this.optionsListPopoverGetAvailableOptionsCount();

    const selectableListItems = await availableOptions.findByClassName('euiSelectableList__list');
    const suggestions: { [key: string]: number } = {};
    while (Object.keys(suggestions).length < optionsCount) {
      await selectableListItems._webElement.sendKeys(this.browser.keys.ARROW_DOWN);
      const currentOption = await selectableListItems.findByCssSelector('[aria-selected="true"]');
      const [suggestion, docCount] = (await currentOption.getVisibleText()).split('\n');
      if (suggestion !== 'Exists') {
        suggestions[suggestion] = Number(docCount);
      }
    }

    const invalidSelectionElements = await availableOptions.findAllByClassName(
      'optionsList__selectionInvalid'
    );
    const invalidSelections = await Promise.all(
      invalidSelectionElements.map(async (option) => {
        return await option.getVisibleText();
      })
    );

    return { suggestions, invalidSelections };
  }

  public async ensureAvailableOptionsEqual(
    controlId: string,
    expectation: { suggestions: { [key: string]: number }; invalidSelections: string[] },
    skipOpen?: boolean
  ) {
    await this.optionsListWaitForLoading(controlId);
    if (!skipOpen) await this.optionsListOpenPopover(controlId);
    await this.retry.try(async () => {
      const availableOptions = await this.optionsListPopoverGetAvailableOptions();
      expect(availableOptions.suggestions).to.eql(expectation.suggestions);
      expect(availableOptions.invalidSelections.sort()).to.eql(
        expectation.invalidSelections.sort()
      );
    });
    if (await this.testSubjects.exists('optionsList-cardinality-label')) {
      expect(await this.optionsListGetCardinalityValue()).to.be(
        Object.keys(expectation.suggestions).length.toLocaleString()
      );
    }
    if (!skipOpen) await this.optionsListEnsurePopoverIsClosed(controlId);
  }

  public async optionsListGetCardinalityValue() {
    this.log.debug(`getting the value of the cardinality badge`);
    const cardinalityLabel = await (
      await this.testSubjects.find('optionsList-cardinality-label')
    ).getVisibleText();
    return cardinalityLabel.split(' ')[0];
  }

  public async optionsListPopoverSearchForOption(search: string) {
    this.log.debug(`searching for ${search} in options list`);
    await this.optionsListPopoverAssertOpen();
    await this.testSubjects.setValue(`optionsList-control-search-input`, search, {
      typeCharByChar: true,
    });
    await this.optionsListPopoverWaitForLoading();
  }

  public async optionsListPopoverClearSearch() {
    this.log.debug(`clearing search from options list`);
    await this.optionsListPopoverAssertOpen();
    await this.find.clickByCssSelector('.euiFormControlLayoutClearButton');
    await this.optionsListPopoverWaitForLoading();
  }

  public async optionsListPopoverSetSort(sort: OptionsListSortingType) {
    this.log.debug(`select sorting type for suggestions`);
    await this.optionsListPopoverAssertOpen();

    await this.testSubjects.click('optionsListControl__sortingOptionsButton');
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail('optionsListControl__sortingOptionsPopover');
    });
    await this.testSubjects.click(`optionsList__sortOrder_${sort.direction}`);
    await this.testSubjects.click(`optionsList__sortBy_${sort.by}`);
    await this.testSubjects.click('optionsListControl__sortingOptionsButton');
    await this.retry.try(async () => {
      await this.testSubjects.missingOrFail(`optionsListControl__sortingOptionsPopover`);
    });

    await this.optionsListPopoverWaitForLoading();
  }

  public async optionsListPopoverSelectExists() {
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail(`optionsList-control-selection-exists`);
      await this.testSubjects.click(`optionsList-control-selection-exists`);
    });
  }

  public async optionsListPopoverSelectOption(availableOption: string) {
    this.log.debug(`selecting ${availableOption} from options list`);
    await this.optionsListPopoverSearchForOption(availableOption);

    await this.retry.try(async () => {
      await this.testSubjects.existOrFail(`optionsList-control-selection-${availableOption}`);
      await this.testSubjects.click(`optionsList-control-selection-${availableOption}`);
    });

    await this.optionsListPopoverClearSearch();
  }

  public async optionsListPopoverSetIncludeSelections(include: boolean) {
    this.log.debug(`exclude selections`);
    await this.optionsListPopoverAssertOpen();

    const buttonGroup = await this.testSubjects.find('optionsList__includeExcludeButtonGroup');
    await (
      await this.find.descendantDisplayedByCssSelector(
        include ? '[data-text="Include"]' : '[data-text="Exclude"]',
        buttonGroup
      )
    ).click();
  }

  public async optionsListWaitForLoading(controlId: string) {
    this.log.debug(`wait for ${controlId} to load`);
    const enabled = await this.testSubjects.waitForEnabled(`optionsList-control-${controlId}`);
    if (!enabled) {
      throw new Error(`${controlId} did not finish loading within the given time limit`);
    }
  }

  public async optionsListPopoverWaitForLoading() {
    this.log.debug(`wait for the suggestions in the popover to load`);
    await this.optionsListPopoverAssertOpen();
    await this.testSubjects.waitForDeleted('optionsList-control-popover-loading');
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

  public async controlEditorSetGrow(grow: boolean) {
    this.log.debug(`Setting control grow to ${grow}`);
    const growSwitch = await this.testSubjects.find('control-editor-grow-switch');
    if ((await growSwitch.getAttribute('aria-checked')) !== `'${grow}'`) {
      await growSwitch.click();
    }
  }

  public async controlEditorSave() {
    this.log.debug(`Saving changes in control editor`);
    await this.testSubjects.click(`control-editor-save`);
    await this.retry.waitFor('flyout to close', async () => {
      return !(await this.testSubjects.exists('control-editor-flyout'));
    });
  }

  public async controlEditorCancel() {
    this.log.debug(`Canceling changes in control editor`);
    await this.testSubjects.click(`control-editor-cancel`);
    if (await this.testSubjects.exists('confirmModalTitleText')) {
      await this.common.clickConfirmOnModal();
    }
  }

  public async controlsEditorSetDataView(dataViewTitle: string) {
    this.log.debug(`Setting control data view to ${dataViewTitle}`);
    await this.testSubjects.click('open-data-view-picker');
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail('data-view-picker-popover');
    });
    await this.testSubjects.click(`data-view-picker-${dataViewTitle}`);
  }

  public async controlsEditorSetfield(fieldName: string, shouldSearch: boolean = true) {
    this.log.debug(`Setting control field to ${fieldName}`);
    if (shouldSearch) {
      await this.testSubjects.setValue('field-search-input', fieldName);
    }
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail(`field-picker-select-${fieldName}`);
    });
    await this.testSubjects.click(`field-picker-select-${fieldName}`);
  }

  public async controlsEditorVerifySupportedControlTypes({
    supportedTypes,
    selectedType = OPTIONS_LIST_CONTROL,
  }: {
    supportedTypes: string[];
    selectedType?: string;
  }) {
    this.log.debug(`Verifying that control types match what is expected for the selected field`);
    await asyncForEach(supportedTypes, async (type) => {
      const controlTypeItem = await this.testSubjects.find(`create__${type}`);
      expect(await controlTypeItem.isEnabled()).to.be(true);
      if (type === selectedType) {
        expect(await controlTypeItem.getAttribute('aria-pressed')).to.be('true');
      }
    });
  }

  public async controlsEditorSetControlType(type: string) {
    this.log.debug(`Setting control type to ${type}`);
    const controlTypeItem = await this.testSubjects.find(`create__${type}`);
    expect(await controlTypeItem.isEnabled()).to.be(true);
    await controlTypeItem.click();
    expect(await controlTypeItem.getAttribute('aria-pressed')).to.be('true');
  }

  // Options List editor functions
  public async optionsListEditorGetCurrentDataView(openAndCloseFlyout?: boolean) {
    if (openAndCloseFlyout) {
      await this.openCreateControlFlyout();
    }
    const dataViewName = (await this.testSubjects.find('open-data-view-picker')).getVisibleText();
    if (openAndCloseFlyout) {
      await this.controlEditorCancel();
    }
    return dataViewName;
  }

  // Range Slider editor functions
  public async rangeSliderEditorSetStep(value: number) {
    this.log.debug(`Setting range slider step to ${value}`);
    await this.testSubjects.setValue('rangeSliderControl__stepAdditionalSetting', `${value}`);
  }

  public async rangeSliderSetAdditionalSettings({ step }: RangeSliderAdditionalSettings) {
    this.log.debug(`Setting range slider step to ${step}`);
    if (step) await this.rangeSliderEditorSetStep(step);
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

  public async rangeSliderSetLowerBound(controlId: string, value: string) {
    this.log.debug(`Setting range slider lower bound to ${value}`);
    await this.retry.try(async () => {
      await this.testSubjects.setValue(
        `range-slider-control-${controlId} > rangeSlider__lowerBoundFieldNumber`,
        value
      );
      await this.testSubjects.pressEnter(
        // force the change without waiting for the debounce
        `range-slider-control-${controlId} > rangeSlider__lowerBoundFieldNumber`
      );
      expect(await this.rangeSliderGetLowerBoundAttribute(controlId, 'value')).to.be(value);
    });
  }

  public async rangeSliderSetUpperBound(controlId: string, value: string) {
    this.log.debug(`Setting range slider lower bound to ${value}`);
    await this.retry.try(async () => {
      await this.testSubjects.setValue(
        `range-slider-control-${controlId} > rangeSlider__upperBoundFieldNumber`,
        value
      );
      await this.testSubjects.pressEnter(
        // force the change without waiting for the debounce
        `range-slider-control-${controlId} > rangeSlider__upperBoundFieldNumber`
      );
      expect(await this.rangeSliderGetUpperBoundAttribute(controlId, 'value')).to.be(value);
    });
  }

  public async rangeSliderOpenPopover(controlId: string) {
    this.log.debug(`Opening popover for Range Slider: ${controlId}`);
    // EuiDualRange only opens the popover when one of the number **inputs** is clicked - it does not open when
    // the delimiter is clicked, so need to ensure we're clicking an input
    await this.testSubjects.click(
      `range-slider-control-${controlId} > rangeSlider__lowerBoundFieldNumber`
    );
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail(`rangeSlider__slider`);
    });
  }

  public async rangeSliderEnsurePopoverIsClosed(controlId: string) {
    this.log.debug(`Closing popover for Range Slider: ${controlId}`);
    const controlLabel = await this.find.byXPath(`//div[@data-control-id='${controlId}']//label`);
    await controlLabel.click();
    await this.testSubjects.waitForDeleted(`rangeSlider__slider`);
  }

  public async rangeSliderPopoverAssertOpen() {
    await this.retry.try(async () => {
      if (!(await this.testSubjects.exists(`rangeSlider__slider`))) {
        throw new Error('range slider popover must be open before calling selectOption');
      }
    });
  }

  public async rangeSliderWaitForLoading(controlId: string) {
    await this.find.waitForDeletedByCssSelector(
      `[data-test-subj="range-slider-control-${controlId}"] .euiLoadingSpinner`
    );
  }

  public async validateRange(
    compare: 'value' | 'placeholder', // if 'value', compare actual selections; otherwise, compare the default range
    controlId: string,
    expectedLowerBound: string,
    expectedUpperBound: string
  ) {
    expect(await this.rangeSliderGetLowerBoundAttribute(controlId, compare)).to.be(
      expectedLowerBound
    );
    expect(await this.rangeSliderGetUpperBoundAttribute(controlId, compare)).to.be(
      expectedUpperBound
    );
  }

  // Time slider functions
  public async gotoNextTimeSlice() {
    await this.closeTimeSliderPopover(); // prevents the pin tooltip from getting in the way
    await this.testSubjects.click('timeSlider-nextTimeWindow');
  }

  public async closeTimeSliderPopover() {
    const isOpen = await this.testSubjects.exists('timeSlider-popoverContents');
    if (isOpen) {
      await this.testSubjects.click('timeSlider-popoverToggleButton');
    }
  }

  public async getTimeSliceFromTimeSlider() {
    const isOpen = await this.testSubjects.exists('timeSlider-popoverContents');
    if (!isOpen) {
      await this.testSubjects.click('timeSlider-popoverToggleButton');
      await this.retry.try(async () => {
        await this.testSubjects.existOrFail('timeSlider-popoverContents');
      });
    }
    const popover = await this.testSubjects.find('timeSlider-popoverContents');
    const dualRangeSlider = await this.find.descendantDisplayedByCssSelector(
      '.euiRangeDraggable',
      popover
    );
    const value = await dualRangeSlider.getAttribute('aria-valuetext');
    return value;
  }
}
