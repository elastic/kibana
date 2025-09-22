/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/no-nth-methods */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout';
import type { ProcessorType } from '@kbn/streamlang';
import type { FieldTypeOption } from '../../../../../public/components/data_management/schema_editor/constants';

export class StreamsApp {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('streams');
    await expect(this.page.getByText('StreamsTechnical Preview')).toBeVisible();
  }

  async gotoStreamManagementTab(streamName: string, tabName: string) {
    await this.page.gotoApp(`streams/${streamName}/management/${tabName}`);
  }

  async gotoPartitioningTab(streamName: string) {
    await this.gotoStreamManagementTab(streamName, 'partitioning');
  }

  async gotoDataRetentionTab(streamName: string) {
    await this.gotoStreamManagementTab(streamName, 'retention');
  }

  async gotoProcessingTab(streamName: string) {
    await this.gotoStreamManagementTab(streamName, 'processing');
  }

  async gotoSchemaEditorTab(streamName: string) {
    await this.gotoStreamManagementTab(streamName, 'schema');
  }

  async gotoSignificantEventsTab(streamName: string) {
    await this.gotoStreamManagementTab(streamName, 'significantEvents');
  }

  async gotoAdvancedTab(streamName: string) {
    await this.gotoStreamManagementTab(streamName, 'advanced');
  }

  // Routing-specific utility methods
  async clickCreateRoutingRule() {
    await this.page.getByTestId('streamsAppStreamDetailRoutingAddRuleButton').click();
  }

  async fillRoutingRuleName(name: string) {
    await this.page.getByTestId('streamsAppRoutingStreamEntryNameField').fill(name);
  }

  async clickEditRoutingRule(streamName: string) {
    await this.page.getByTestId(`routingRuleEditButton-${streamName}`).click();
  }

  async saveRoutingRule() {
    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  async updateRoutingRule() {
    await this.page.getByRole('button', { name: 'Change routing' }).click();
  }

  async cancelRoutingRule() {
    await this.page.getByRole('button', { name: 'Cancel' }).click();
  }

  async removeRoutingRule() {
    await this.page.getByRole('button', { name: 'Remove' }).click();
  }

  getModal() {
    return this.page.locator('[role="dialog"], [role="alertdialog"]');
  }

  async confirmDeleteInModal() {
    await this.getModal().getByRole('button', { name: 'Delete' }).click();
    await expect(this.getModal()).toBeHidden();
  }

  async confirmStreamDeleteInModal(streamName: string) {
    await this.getModal()
      .getByTestId('streamsAppDeleteStreamModalStreamNameInput')
      .fill(streamName);
    await this.getModal().getByRole('button', { name: 'Delete' }).click();
    await expect(this.getModal()).toBeHidden();
  }

  async cancelDeleteInModal() {
    await this.getModal().getByRole('button', { name: 'Cancel' }).click();
    await expect(this.getModal()).toBeHidden();
  }

  // Condition editor utility methods
  async fillConditionEditor({
    field,
    value,
    operator,
  }: {
    field?: string;
    value?: string;
    operator?: string;
  }) {
    if (field) {
      await this.page.getByTestId('streamsAppConditionEditorFieldText').fill(field);
    }
    if (value) {
      await this.page.getByTestId('streamsAppConditionEditorValueText').fill(value);
    }
    if (operator) {
      await this.page.getByTestId('streamsAppConditionEditorOperator').selectOption(operator);
    }
  }

  async fillConditionEditorWithSyntax(condition: string) {
    // Clean previous content
    await this.page.getByTestId('streamsAppConditionEditorCodeEditor').click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    // Fill with new condition
    await this.page
      .getByTestId('streamsAppConditionEditorCodeEditor')
      .getByRole('textbox')
      .fill(condition);
    // Clean trailing content
    await this.page.keyboard.press('Shift+Control+ArrowDown');
    await this.page.keyboard.press('Backspace');
  }

  async toggleConditionEditorWithSyntaxSwitch() {
    await this.page.getByTestId('streamsAppConditionEditorSwitch').click();
  }

  // Drag and drop utility methods, use with keyboard to test accessibility
  async dragRoutingRule(sourceStream: string, steps: number) {
    // Focus source item and activate DnD
    await this.page.getByTestId(`routingRuleDragHandle-${sourceStream}`).focus();
    await this.page.keyboard.press('Space');
    const arrowButton = steps > 0 ? 'ArrowDown' : 'ArrowUp';
    let absoluteSteps = Math.abs(steps);
    while (absoluteSteps > 0) {
      this.page.keyboard.press(arrowButton);
      absoluteSteps--;
    }
    // Release DnD
    await this.page.keyboard.press('Space');
  }

  async dragProcessor({ processorPos, steps }: { processorPos: number; steps: number }) {
    // Focus source item and activate DnD
    const processors = await this.getProcessorsListItems();
    const targetProcessor = processors[processorPos];
    await targetProcessor.getByTestId('streamsAppProcessorDragHandle').focus();
    await this.page.keyboard.press('Space');
    const arrowButton = steps > 0 ? 'ArrowDown' : 'ArrowUp';
    let absoluteSteps = Math.abs(steps);
    while (absoluteSteps > 0) {
      this.page.keyboard.press(arrowButton);
      absoluteSteps--;
    }
    // Release DnD
    await this.page.keyboard.press('Space');
  }

  // Expectation utility methods
  async expectRoutingRuleVisible(streamName: string) {
    await expect(this.page.getByTestId(`routingRule-${streamName}`)).toBeVisible();
  }

  async expectRoutingRuleHidden(streamName: string) {
    await expect(this.page.getByTestId(`routingRule-${streamName}`)).toBeHidden();
  }

  async expectRoutingOrder(expectedOrder: string[]) {
    // Wait for the routing rules to be rendered before getting their locators

    await expect(this.page.locator('[data-test-subj^="routingRule-"]').first()).toBeVisible();

    const rulesLocators = await this.page.testSubj.locator('^routingRule-').all();

    const actualOrder = await Promise.all(
      rulesLocators.map(async (ruleLocator) => {
        const testSubj = await ruleLocator.getAttribute('data-test-subj');
        return testSubj?.replace('routingRule-', '');
      })
    );

    expect(actualOrder).toStrictEqual(expectedOrder);
  }

  async expectStreamNameFieldVisible() {
    await expect(this.page.getByTestId('streamsAppRoutingStreamEntryNameField')).toBeVisible();
  }

  async expectPreviewPanelVisible() {
    await expect(this.page.getByTestId('routingPreviewPanelWithResults')).toBeVisible();
  }

  async expectToastVisible() {
    // Check if at least one element appears and is visible.
    await expect(this.page.getByTestId('toastCloseButton').first()).toBeVisible();
  }

  async saveRuleOrder() {
    await this.page.getByRole('button', { name: 'Change routing' }).click();
  }

  async cancelChanges() {
    await this.page.getByRole('button', { name: 'Cancel changes' }).click();
    await this.getModal().getByRole('button', { name: 'Discard unsaved changes' }).click();
  }

  /**
   * Utility for data processing
   */
  async clickAddProcessor() {
    await this.page.getByTestId('streamsAppStreamDetailEnrichmentCreateStepButton').click();
    await this.page
      .getByTestId('streamsAppStreamDetailEnrichmentCreateStepButtonAddProcessor')
      .click();
  }

  async clickSaveProcessor() {
    await this.page.getByTestId('streamsAppProcessorConfigurationSaveProcessorButton').click();
  }

  async clickCancelProcessorChanges() {
    await this.page.getByTestId('streamsAppProcessorConfigurationCancelButton').click();
  }

  async clickEditProcessor(pos: number) {
    const processorEditButton = await this.getProcessorEditButton(pos);
    await processorEditButton.click();
  }

  async clickManageDataSourcesButton() {
    await this.page.getByTestId('streamsAppProcessingManageDataSourcesButton').click();
  }

  async addDataSource(type: 'kql' | 'custom') {
    await this.page.getByTestId('streamsAppProcessingAddDataSourcesContextMenu').click();
    const dataSourcesMap = {
      kql: 'streamsAppProcessingAddKqlDataSource',
      custom: 'streamsAppProcessingAddCustomDataSource',
    };
    await this.page.getByTestId(dataSourcesMap[type]).click();
  }

  async getProcessorEditButton(pos: number) {
    const processors = await this.getProcessorsListItems();
    const targetProcessor = processors[pos];
    await targetProcessor.getByRole('button', { name: 'Step context menu' }).click();
    return this.page.getByTestId('stepContextMenuEditItem');
  }

  async getProcessorContextMenuButton(pos: number) {
    const processors = await this.getProcessorsListItems();
    const targetProcessor = processors[pos];
    return targetProcessor.getByRole('button', { name: 'Step context menu' });
  }

  async confirmDiscardInModal() {
    await this.getModal().getByRole('button', { name: 'Discard' }).click();
    await expect(this.getModal()).toBeHidden();
  }

  async selectProcessorType(value: ProcessorType) {
    await this.page.getByTestId('streamsAppProcessorTypeSelector').click();
    await this.page.getByRole('dialog').getByRole('option').getByText(value).click();
  }

  async fillFieldInput(value: string) {
    const comboBoxInput = this.page.getByTestId('streamsAppProcessorFieldSelectorComboFieldText');
    await comboBoxInput.click();
    await comboBoxInput.pressSequentially(value, { delay: 50 });
  }

  async fillGrokPatternInput(value: string) {
    // Clean previous content
    await this.page.getByTestId('streamsAppPatternExpression').click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    // Fill with new condition
    await this.page.getByTestId('streamsAppPatternExpression').getByRole('textbox').fill(value);
  }

  async fillCustomSamplesEditor(value: string) {
    // Clean previous content
    await this.page.getByTestId('streamsAppCustomSamplesDataSourceEditor').click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    // Fill with new condition
    await this.page
      .getByTestId('streamsAppCustomSamplesDataSourceEditor')
      .getByRole('textbox')
      .fill(value);
  }

  async removeProcessor(pos: number) {
    await this.clickEditProcessor(pos);
    await this.page.getByRole('button', { name: 'Delete processor' }).click();
  }

  async saveProcessorsListChanges() {
    await this.page.getByRole('button', { name: 'Save changes' }).click();
  }

  async getProcessorsListItems() {
    try {
      await expect(this.page.getByTestId('streamsAppStreamDetailEnrichmentRootSteps')).toBeVisible({
        timeout: 15_000,
      });
    } catch {
      // If the list is not visible, it might be empty or not rendered yet
      return [];
    }
    return this.page.getByTestId('streamsAppProcessorBlock').all();
  }

  async expectProcessorsOrder(expectedOrder: string[]) {
    // Wait for the routing rules to be rendered before getting their locators
    const processorLocators = await this.getProcessorsListItems();

    const actualOrder = await Promise.all(
      processorLocators.map(async (processorLocator) => {
        return processorLocator.getByTestId('streamsAppProcessorLegend').textContent();
      })
    );

    expect(actualOrder).toStrictEqual(expectedOrder);
  }

  getDataSourcesList() {
    return this.page.getByTestId('streamsAppProcessingDataSourcesList');
  }

  getDataSourcesListItems() {
    return this.getDataSourcesList().getByTestId('streamsAppProcessingDataSourceListItem');
  }

  /**
   * Utility for data preview
   */
  async getPreviewTableRows() {
    // Wait for the preview table to be rendered
    await expect(this.page.getByTestId('euiDataGridBody')).toBeVisible();
    return this.page.locator('[class="euiDataGridRow"]').all();
  }

  async expectCellValueContains({
    columnName,
    rowIndex,
    value,
    invertCondition = false,
  }: {
    columnName: string;
    rowIndex: number;
    value: string;
    invertCondition?: boolean;
  }) {
    const cellContent = this.page.locator(
      `[data-gridcell-column-id="${columnName}"][data-gridcell-row-index="${rowIndex}"]`
    );

    if (invertCondition) {
      await expect(cellContent).not.toContainText(value);
    } else {
      await expect(cellContent).toContainText(value);
    }
  }

  /**
   * Schema Editor specific utility methods
   */
  async expectSchemaEditorTableVisible() {
    await expect(this.page.getByTestId('streamsAppSchemaEditorFieldsTableLoaded')).toBeVisible();
  }

  async searchFields(searchTerm: string) {
    const searchBox = this.page
      .getByTestId('streamsAppSchemaEditorControls')
      .getByRole('searchbox');
    await expect(searchBox).toBeVisible();
    searchBox.clear();
    await searchBox.focus();
    await this.page.keyboard.type(searchTerm);
  }

  async clearFieldSearch() {
    const searchBox = this.page
      .getByTestId('streamsAppSchemaEditorControls')
      .getByRole('searchbox');
    await searchBox.clear();
  }

  async clickFieldTypeFilter() {
    await this.page.getByRole('button', { name: 'Type' }).click();
  }

  async clickFieldStatusFilter() {
    await this.page.getByRole('button', { name: 'Status' }).click();
  }

  async selectFilterValue(value: string) {
    await this.getModal().getByRole('option').getByText(value).click();
  }

  async openFieldActionsMenu() {
    await expect(this.page.getByTestId('streamsAppActionsButton')).toHaveCount(1);
    await this.page.getByTestId('streamsAppActionsButton').click();
    await expect(this.getModal().getByText('Field actions')).toBeVisible();
  }

  async clickFieldAction(actionName: string) {
    await this.getModal().getByText(actionName).click();
    await expect(this.getModal().getByText('Field actions')).toBeHidden();
  }

  async expectFieldFlyoutOpen() {
    await expect(this.page.getByTestId('streamsAppSchemaEditorFlyoutCloseButton')).toBeVisible();
  }

  async setFieldMappingType(type: FieldTypeOption) {
    const typeSelector = this.page.getByTestId('streamsAppFieldFormTypeSelect');
    await expect(typeSelector).toBeVisible();
    await typeSelector.selectOption(type);
  }

  async stageFieldMappingChanges() {
    await this.page.getByTestId('streamsAppSchemaEditorFieldStageButton').click();
  }

  async unmapField() {
    await this.openFieldActionsMenu();
    await this.clickFieldAction('Unmap field');
  }

  async discardStagedFieldMappingChanges() {
    await this.page.getByTestId('streamsAppSchemaEditorDiscardChangesButton').click();
  }

  async reviewStagedFieldMappingChanges() {
    await this.page.getByTestId('streamsAppSchemaEditorReviewStagedChangesButton').click();
  }

  async closeSchemaReviewModal() {
    await this.page.getByTestId('streamsAppSchemaChangesReviewModalCancelButton').click();
  }

  async submitSchemaChanges() {
    await this.page.getByTestId('streamsAppSchemaChangesReviewModalSubmitButton').click();
  }

  /**
   * Share utility methods
   */
  async closeToasts() {
    await this.expectToastVisible();
    // Check if at least one element appears and is visible.

    // Get an array of all locators and loop through them
    const allCloseButtons = this.page.getByTestId('toastCloseButton');
    for (const button of await allCloseButtons.all()) {
      await button.click();
    }

    await expect(this.page.getByTestId('toastCloseButton')).toHaveCount(0);
  }

  async closeFlyout() {
    await this.page.getByTestId('euiFlyoutCloseButton').click();
    await expect(this.page.getByTestId('euiFlyoutCloseButton')).toBeHidden();
  }
}
