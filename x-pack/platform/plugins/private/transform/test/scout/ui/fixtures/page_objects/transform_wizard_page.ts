/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';

const RUNTIME_MAPPINGS_EDITOR = 'transformAdvancedRuntimeMappingsEditor';
const PIVOT_EDITOR = 'transformAdvancedPivotEditor';
// The filter term options load from Elasticsearch behind a 600ms debounced search.
const TERM_OPTIONS_TIMEOUT_MS = 10_000;
const TYPING_DELAY_MS = 100;

export type FieldStatsOptionList =
  | 'transformGroupBySelection'
  | 'transformAggregationSelection'
  | 'transformWizardUniqueKeysSelector'
  | 'transformWizardSortFieldSelector';

export interface AggregationForm {
  filterType?: string;
  filterTermValue?: string;
  percents?: number[];
}

export class TransformWizardPage {
  public readonly defineStep: Locator;
  public readonly detailsStep: Locator;
  public readonly createStep: Locator;
  public readonly groupBySelection: Locator;
  public readonly uniqueKeysSelection: Locator;
  public readonly runtimeMappingsSwitch: Locator;
  public readonly indexPreviewEmpty: Locator;
  public readonly indexPreview: Locator;
  public readonly pivotPreview: Locator;
  public readonly pivotPreviewHistogramButton: Locator;
  public readonly queryInput: Locator;
  public readonly transformIdInput: Locator;
  public readonly descriptionInput: Locator;
  public readonly destIndexSameAsIdSwitch: Locator;
  public readonly destinationIndexInput: Locator;
  public readonly createDataViewSwitch: Locator;
  public readonly continuousModeSwitch: Locator;
  public readonly retentionPolicySwitch: Locator;
  public readonly retentionPolicyFieldSelect: Locator;
  public readonly retentionPolicyMaxAgeInput: Locator;
  public readonly frequencyInput: Locator;
  public readonly numFailureRetriesInput: Locator;
  public readonly numFailureRetriesSummary: Locator;
  public readonly createAndStartButton: Locator;
  public readonly createButton: Locator;
  public readonly copyToClipboardButton: Locator;
  public readonly startButton: Locator;
  public readonly progressBar: Locator;
  public readonly managementCard: Locator;
  public readonly discoverCard: Locator;
  public readonly errorToast: Locator;
  public readonly transformPreviewEmpty: Locator;
  public readonly advancedQueryEditorSwitch: Locator;
  public readonly advancedPivotEditorSwitch: Locator;
  public readonly indexPreviewHistogramButton: Locator;
  public readonly useFullDataButton: Locator;
  public readonly dataTierOptionsButton: Locator;
  public readonly startDateButton: Locator;
  public readonly endDateButton: Locator;
  public readonly fieldStatsFlyout: Locator;
  public readonly dataViewTimeFieldSelect: Locator;
  public readonly continuousModeDateFieldSelect: Locator;
  public readonly runtimeMappingsApplyButton: Locator;

  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.defineStep = page.getByTestId('transformStepDefineForm');
    this.detailsStep = page.getByTestId('transformStepDetailsForm');
    this.createStep = page.getByTestId('transformStepCreateForm');
    this.groupBySelection = page.getByTestId('transformGroupBySelection');
    this.uniqueKeysSelection = page.getByTestId('transformWizardUniqueKeysSelector');
    this.runtimeMappingsSwitch = page.getByTestId('transformAdvancedRuntimeMappingsEditorSwitch');
    this.indexPreviewEmpty = page.getByTestId('transformIndexPreview empty');
    this.indexPreview = page.getByTestId('transformIndexPreview loaded');
    this.pivotPreview = page.getByTestId('transformPivotPreview loaded');
    this.pivotPreviewHistogramButton = page.getByTestId('transformPivotPreviewHistogramButton');
    this.queryInput = page.getByTestId('transformQueryInput');
    this.transformIdInput = page.getByTestId('transformIdInput');
    this.descriptionInput = page.getByTestId('transformDescriptionInput');
    this.destIndexSameAsIdSwitch = page.getByTestId(
      'mlCreationWizardUtilsJobIdAsDestIndexNameSwitch'
    );
    this.destinationIndexInput = page.getByTestId('mlCreationWizardUtilsDestinationIndexInput');
    this.createDataViewSwitch = page.getByTestId('mlCreateDataViewSwitch');
    this.continuousModeSwitch = page.getByTestId('transformContinuousModeSwitch');
    this.retentionPolicySwitch = page.getByTestId('transformRetentionPolicySwitch');
    this.retentionPolicyFieldSelect = page.getByTestId('transformRetentionPolicyDateFieldSelect');
    this.retentionPolicyMaxAgeInput = page.getByTestId('transformRetentionPolicyMaxAgeInput');
    this.frequencyInput = page.getByTestId('transformFrequencyInput');
    this.numFailureRetriesInput = page.getByTestId('transformNumFailureRetriesInput');
    this.numFailureRetriesSummary = page.getByTestId(
      'transformWizardAdvancedSettingsNumFailureRetriesLabel'
    );
    this.createAndStartButton = page.getByTestId('transformWizardCreateAndStartButton');
    this.createButton = page.getByTestId('transformWizardCreateButton');
    this.copyToClipboardButton = page.getByTestId('transformWizardCopyToClipboardButton');
    this.startButton = page.getByTestId('transformWizardStartButton');
    this.progressBar = page.getByTestId('transformWizardProgressBar');
    this.managementCard = page.getByTestId('transformWizardCardManagement');
    this.discoverCard = page.getByTestId('transformWizardCardDiscover');
    this.errorToast = page.getByTestId('errorToastMessage');
    this.transformPreviewEmpty = page.getByTestId('transformPivotPreview empty');
    this.advancedQueryEditorSwitch = page.getByTestId('transformAdvancedQueryEditorSwitch');
    this.advancedPivotEditorSwitch = page.getByTestId('transformAdvancedPivotEditorSwitch');
    this.indexPreviewHistogramButton = page.getByTestId('transformIndexPreviewHistogramButton');
    this.useFullDataButton = page.getByTestId('mlDatePickerButtonUseFullData');
    this.dataTierOptionsButton = page.getByTestId('mlDatePickerButtonDataTierOptions');
    this.startDateButton = page.getByTestId('superDatePickerstartDatePopoverButton');
    this.endDateButton = page.getByTestId('superDatePickerendDatePopoverButton');
    this.fieldStatsFlyout = page.getByTestId('mlFieldStatsFlyout');
    this.dataViewTimeFieldSelect = page.getByTestId('mlDataViewTimeFieldSelect');
    this.continuousModeDateFieldSelect = page.getByTestId('transformContinuousDateFieldSelect');
    this.runtimeMappingsApplyButton = page.getByTestId('transformRuntimeMappingsApplyButton');
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  async setRuntimeMappings(runtimeMappings: string) {
    await this.codeEditor.setCodeEditorValueByTestSubj(RUNTIME_MAPPINGS_EDITOR, runtimeMappings);
    await this.runtimeMappingsApplyButton.click();
    await this.runtimeMappingsApplyButton
      .and(this.page.getByRole('button', { disabled: true }))
      .waitFor({ state: 'visible' });
  }

  async enableAdvancedPivotEditor() {
    // The last picker's popover returns focus late, scrolling the page and stealing pointer and
    // keyboard input, so fire the click on the switch itself.
    await this.advancedPivotEditorSwitch.dispatchEvent('click');
    await this.advancedPivotEditorSwitch
      .and(this.page.getByRole('switch', { checked: true }))
      .waitFor({ state: 'visible' });
    await this.page.getByTestId(PIVOT_EDITOR).waitFor({ state: 'visible' });
  }

  private async getAdvancedPivotEditorValue(): Promise<string> {
    return this.codeEditor.getCodeEditorValueByTestSubj(PIVOT_EDITOR);
  }

  async getAdvancedPivotEditorGroupByNames(): Promise<string[]> {
    return Object.keys(JSON.parse(await this.getAdvancedPivotEditorValue()).group_by);
  }

  // ── Option lists with field stats (group by, aggregations, unique keys, sort field) ──

  /**
   * Opens the option list of the given picker and shows empty fields too, as the FTR did,
   * so options don't depend on which fields happen to be populated in the sample.
   */
  private async openOptionList(trigger: Locator) {
    await trigger.getByTestId('comboBoxInput').click();
    await this.page.getByTestId('optionsListControlAvailableOptions').waitFor({ state: 'visible' });
    const includeEmptyFields = this.page.getByTestId('optionsListIncludeEmptyFields');
    if ((await includeEmptyFields.getAttribute('aria-checked')) !== 'true') {
      await includeEmptyFields.click();
      await includeEmptyFields
        .and(this.page.getByRole('switch', { checked: true }))
        .waitFor({ state: 'visible' });
    }
  }

  private async selectFromOptionList(trigger: Locator, value: string) {
    await this.openOptionList(trigger);
    await this.page.getByTestId('optionsListFilterInput').fill(value);
    await this.page.getByTestId(`optionsListControlSelection-${value}`).click();
    // The list closes itself on selection; wait so it can't overlay the next control.
    await this.page.getByTestId('optionsListControlAvailableOptions').waitFor({ state: 'hidden' });
  }

  async addGroupByEntry(identifier: string) {
    await this.selectFromOptionList(this.groupBySelection, identifier);
  }

  /** Entry panel by its index path; sub-aggregation panels are nested in their parent's. */
  getAggregationEntry(path: number[]): Locator {
    const [first, ...rest] = path;
    return rest.reduce(
      (entry, index) => entry.getByTestId(`transformAggregationEntry_${index}`),
      this.page.getByTestId(`transformAggregationEntry_${first}`)
    );
  }

  async addAggregationEntry(identifier: string, parentPath: number[] = []) {
    const trigger =
      parentPath.length === 0
        ? this.page.getByTestId('transformAggregationSelection')
        : this.getAggregationEntry(parentPath).getByTestId('transformSubAggregationSelection');
    await this.selectFromOptionList(trigger, identifier);
  }

  getGroupByEntryLabel(index: number): Locator {
    return this.page
      .getByTestId(`transformGroupByEntry ${index}`)
      .getByTestId('transformGroupByEntryLabel');
  }

  getGroupByEntryIntervalLabel(index: number): Locator {
    return this.page
      .getByTestId(`transformGroupByEntry ${index}`)
      .getByTestId('transformGroupByEntryIntervalLabel');
  }

  /**
   * Fills an aggregation's popover form and applies it. Aggregations that aren't valid with
   * their defaults (e.g. a filter without a type) open the popover on their own when added;
   * the caller says which case it is instead of probing the DOM for it.
   */
  async fillAggregationForm(aggName: string, form: AggregationForm, opensOnAdd: boolean) {
    if (!opensOnAdd) {
      await this.page.getByTestId(`transformAggregationEntryEditButton_${aggName}`).click();
    }
    await this.page.getByTestId(`transformAggPopoverForm_${aggName}`).waitFor({ state: 'visible' });

    // Only one form popover is open at a time. Its controls aren't scoped to it because picking a
    // filter term renames the aggregation, and with it the popover's data-test-subj.
    if (form.filterType !== undefined) {
      await this.page.getByTestId('transformFilterAggTypeSelector').selectOption(form.filterType);
    }
    if (form.filterTermValue !== undefined) {
      await this.page.components
        .comboBox('transformFilterTermValueSelector')
        .setSelectedOptions([form.filterTermValue], { timeout: TERM_OPTIONS_TIMEOUT_MS });
    }
    if (form.percents !== undefined) {
      await this.setPercents(form.percents);
    }

    const applyButton = this.page.getByTestId('transformApplyAggChanges');
    await applyButton.click();
    await applyButton.waitFor({ state: 'hidden' });
  }

  /**
   * The percents box validates the typed value asynchronously and drops an Enter that arrives before
   * the value is validated, so type each value like a user and wait for its pill.
   */
  private async setPercents(percents: number[]) {
    const combo = this.page.getByTestId('transformPercentilesAggPercentsSelector');
    await this.page.components.comboBox('transformPercentilesAggPercentsSelector').clear();
    const input = combo.getByTestId('comboBoxSearchInput');
    for (const percent of percents) {
      await input.pressSequentially(String(percent), { delay: TYPING_DELAY_MS });
      await input.press('Enter');
      await combo
        .getByTestId('euiComboBoxPill')
        .filter({ hasText: new RegExp(`^${percent}$`) })
        .waitFor({ state: 'visible' });
    }
  }

  async addUniqueKey(identifier: string) {
    await this.page.components
      .comboBox('transformWizardUniqueKeysSelector')
      .setSelectedOptions([identifier]);
    await this.page
      .getByTestId(/transformWizardUniqueKeysSelector-optionsList/)
      .waitFor({ state: 'hidden' });
  }

  async setSortField(identifier: string) {
    await this.selectFromOptionList(
      this.page.getByTestId('transformWizardSortFieldSelector'),
      identifier
    );
  }

  /** Opens the field stats flyout from the option list of a picker. */
  async openFieldStatsFlyout(trigger: FieldStatsOptionList, fieldName: string) {
    const inspectButton = this.page.getByTestId(`mlInspectFieldStatsButton-${fieldName}`);
    await this.page.getByTestId(trigger).getByTestId('comboBoxInput').click();
    await inspectButton.click();
    await this.fieldStatsFlyout.waitFor({ state: 'visible' });
    await this.page
      .getByTestId(`mlFieldStatsFlyoutContent ${fieldName}-title`)
      .waitFor({ state: 'visible' });
  }

  getFieldStatsContent(fieldName: string, part: 'histogram' | 'topValues'): Locator {
    return this.page.getByTestId(`mlFieldStatsFlyoutContent ${fieldName}-${part}`);
  }

  /**
   * The flyout is a push flyout that ignores Escape, so close it explicitly every time. Blurring
   * the picker then closes any option list left open behind it, and lets the next click reopen it.
   */
  async closeFieldStatsFlyout(trigger: FieldStatsOptionList, fieldName: string) {
    await this.page.getByTestId('mlFieldStatsFlyoutCloseButton').click();
    await this.fieldStatsFlyout.waitFor({ state: 'hidden' });
    await this.page.getByTestId(trigger).getByTestId('comboBoxSearchInput').blur();
    await this.page
      .getByTestId(`mlInspectFieldStatsButton-${fieldName}`)
      .waitFor({ state: 'hidden' });
  }

  getHistogramChart(columnId: string, part: 'histogram' | 'legend' | 'id'): Locator {
    return this.indexPreview.getByTestId(`mlDataGridChart-${columnId}-${part}`);
  }

  async setContinuousMode(dateField: string) {
    await this.continuousModeSwitch.click();
    await this.continuousModeDateFieldSelect.waitFor({ state: 'visible' });
    await this.continuousModeDateFieldSelect.selectOption(dateField);
  }

  async enableRuntimeMappingsEditor() {
    await this.runtimeMappingsSwitch.click();
    await this.runtimeMappingsSwitch
      .and(this.page.getByRole('switch', { checked: true }))
      .waitFor({ state: 'visible' });
    await this.page.getByTestId(RUNTIME_MAPPINGS_EDITOR).waitFor({ state: 'visible' });
  }

  async getRuntimeMappingsEditorValue(): Promise<string> {
    return this.codeEditor.getCodeEditorValueByTestSubj(RUNTIME_MAPPINGS_EDITOR);
  }

  async getRuntimeMappingsEditorFieldNames(): Promise<string[]> {
    return Object.keys(JSON.parse((await this.getRuntimeMappingsEditorValue()) || '{}'));
  }

  async useFullData() {
    await this.useFullDataButton.click();
    await this.indexPreview.waitFor({ state: 'visible' });
  }

  /**
   * Cell values of a data grid column, read from the rendered cells (rows are virtualized).
   */
  async getDataGridColumnValues(grid: Locator, columnId: string): Promise<string[]> {
    return grid.getByTestId('dataGridRowCell').evaluateAll(
      (cells, column) =>
        cells
          .filter((cell) => cell.getAttribute('data-gridcell-column-id') === column)
          // Only the cell content: the cell also renders the expand button's text.
          .map(
            (cell) => cell.querySelector('.euiDataGridRowCell__content')?.textContent?.trim() ?? ''
          ),
      columnId
    );
  }

  async getDataGridRowCount(grid: Locator): Promise<number> {
    const rowIndexes = await grid
      .getByTestId('dataGridRowCell')
      .evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-gridcell-row-index')));
    return new Set(rowIndexes).size;
  }

  /** Labels in document order; filter aggregations nest their sub-aggregation entries. */
  async getGroupByEntryLabels(): Promise<string[]> {
    return this.page.getByTestId('transformGroupByEntryLabel').allTextContents();
  }

  async getAggregationEntryLabels(): Promise<string[]> {
    return this.page.getByTestId('transformAggregationEntryLabel').allTextContents();
  }

  getAggregationApplyButton(aggName: string): Locator {
    return this.page
      .getByTestId(`transformAggPopoverForm_${aggName}`)
      .getByTestId('transformApplyAggChanges');
  }

  async openAggregationEditPopover(aggName: string) {
    await this.page.getByTestId(`transformAggregationEntryEditButton_${aggName}`).click();
    await this.page.getByTestId(`transformAggPopoverForm_${aggName}`).waitFor({ state: 'visible' });
  }

  // The edit button toggles the popover; Escape is lost if it lands before the focus trap is active.
  async closeAggregationEditPopover(aggName: string) {
    await this.page.getByTestId(`transformAggregationEntryEditButton_${aggName}`).click();
    await this.page.getByTestId(`transformAggPopoverForm_${aggName}`).waitFor({ state: 'hidden' });
  }

  async getUniqueKeys(): Promise<string[]> {
    return this.page.components.comboBox('transformWizardUniqueKeysSelector').getSelectedOptions();
  }

  /** The sort field is an ML options list, not an EuiComboBox; its input shows the selection. */
  getSortFieldInput(): Locator {
    return this.page
      .getByTestId('transformWizardSortFieldSelector')
      .getByTestId('comboBoxSearchInput');
  }

  async advanceToDetailsStep() {
    await this.page.getByTestId('transformWizardNavButtonNext').click();
    await this.detailsStep.waitFor({ state: 'visible' });
    await this.page.getByTestId('transformStepDefineSummary').waitFor({ state: 'visible' });
  }

  async openAdvancedSettings() {
    await this.page
      .getByTestId('transformWizardAccordionAdvancedSettings')
      .getByRole('button', { name: 'Advanced settings' })
      .click();
    await this.frequencyInput.waitFor({ state: 'visible' });
  }

  async advanceToCreateStep() {
    await this.page.getByTestId('transformWizardNavButtonNext').click();
    await this.createStep.waitFor({ state: 'visible' });
    await this.page.getByTestId('transformStepDetailsSummary').waitFor({ state: 'visible' });
  }

  async openAdvancedSettingsSummary() {
    await this.page
      .getByTestId('transformWizardAccordionAdvancedSettingsSummary')
      .getByRole('button', { name: 'Advanced settings' })
      .click();
    await this.page
      .getByTestId('transformWizardAdvancedSettingsFrequencyLabel')
      .waitFor({ state: 'visible' });
  }

  async createTransform() {
    await this.createButton.click();
    await this.startButton
      .and(this.page.getByRole('button', { disabled: false }))
      .waitFor({ state: 'visible' });
    await this.managementCard.waitFor({ state: 'visible' });
  }

  async startTransform() {
    await this.startButton.click();
    await this.discoverCard.waitFor({ state: 'visible' });
  }

  async redirectToDiscover() {
    await this.discoverCard.click();
    await this.page.getByTestId('discover-dataView-switch-link').waitFor({ state: 'visible' });
  }

  async returnToManagement() {
    await this.managementCard.click();
    await this.page.getByTestId('transformPageTransformList').waitFor({ state: 'visible' });
  }
}
