/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ScoutPage, expect } from '@kbn/scout';

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
    await this.gotoStreamManagementTab(streamName, 'route');
  }

  async gotoDataRetentionTab(streamName: string) {
    await this.gotoStreamManagementTab(streamName, 'lifecycle');
  }

  async gotoProcessingTab(streamName: string) {
    await this.gotoStreamManagementTab(streamName, 'enrich');
  }

  async gotoSchemaEditorTab(streamName: string) {
    await this.gotoStreamManagementTab(streamName, 'schemaEditor');
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

  getDeleteModal() {
    return this.page.getByRole('dialog');
  }

  async confirmDeleteInModal() {
    await this.getDeleteModal().getByRole('button', { name: 'Delete' }).click();
    await expect(this.getDeleteModal()).toBeHidden();
  }

  async cancelDeleteInModal() {
    await this.getDeleteModal().getByRole('button', { name: 'Cancel' }).click();
    await expect(this.getDeleteModal()).toBeHidden();
  }

  async closeToast() {
    await this.page.getByTestId('toastCloseButton').click();
    await expect(this.page.getByRole('log')).toBeHidden();
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

  // Expectation utility methods
  async expectRoutingRuleVisible(streamName: string) {
    await expect(this.page.getByTestId(`routingRule-${streamName}`)).toBeVisible();
  }

  async expectRoutingRuleHidden(streamName: string) {
    await expect(this.page.getByTestId(`routingRule-${streamName}`)).toBeHidden();
  }

  async expectRoutingOrder(expectedOrder: string[]) {
    // Wait for the routing rules to be rendered before getting their locators
    await expect(this.page.locator('[data-test-subj^="routingRule-"]')).toHaveCount(3);
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
    await expect(this.page.getByRole('log')).toBeVisible();
  }

  async saveRuleOrder() {
    await this.page.getByRole('button', { name: 'Change routing' }).click();
  }

  async cancelRuleOrder() {
    await this.page.getByRole('button', { name: 'Cancel changes' }).click();
    await this.page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Discard unsaved changes' })
      .click();
  }

  // Utility for data preview
  async getPreviewTableRows() {
    // Wait for the preview table to be rendered
    await expect(this.page.getByTestId('euiDataGridBody')).toBeVisible();
    return this.page.locator('[class="euiDataGridRow"]').all();
  }

  async expectCellValue({
    columnName,
    rowIndex,
    value,
  }: {
    columnName: string;
    rowIndex: number;
    value: string;
  }) {
    const cellContent = this.page.locator(
      `[data-gridcell-column-id="${columnName}"][data-gridcell-row-index="${rowIndex}"]`
    );
    await expect(cellContent).toContainText(value);
  }
}
