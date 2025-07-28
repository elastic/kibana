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
    await this.page.testSubj.locator('streamsAppStreamDetailRoutingAddRuleButton').click();
  }

  async fillRoutingRuleName(name: string) {
    await this.page.testSubj.locator('streamsAppRoutingStreamEntryNameField').fill(name);
  }

  async clickEditRoutingRule(streamName: string) {
    await this.page.testSubj.locator(`routingRuleEditButton-${streamName}`).click();
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
  }

  async cancelDeleteInModal() {
    await this.getDeleteModal().getByRole('button', { name: 'Cancel' }).click();
  }

  async closeToast() {
    await this.page.testSubj.locator('toastCloseButton').click();
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
      await this.page.testSubj.locator('streamsAppConditionEditorFieldText').fill(field);
    }
    if (value) {
      await this.page.testSubj.locator('streamsAppConditionEditorValueText').fill(value);
    }
    if (operator) {
      await this.page.testSubj.locator('streamsAppConditionEditorOperator').selectOption(operator);
    }
  }

  // Drag and drop utility methods
  async dragRoutingRule(sourceStream: string, targetStream: string) {
    await this.page.testSubj.locator(`routingRuleDragHandle-${sourceStream}`).hover();
    await this.page.mouse.down();
    await this.page.testSubj.locator(`routingRule-${targetStream}`).hover();
    await this.page.mouse.up();
  }

  // Expectation utility methods
  async expectRoutingRuleVisible(streamName: string) {
    await expect(this.page.testSubj.locator(`routingRule-${streamName}`)).toBeVisible();
  }

  async expectRoutingRuleHidden(streamName: string) {
    await expect(this.page.testSubj.locator(`routingRule-${streamName}`)).toBeHidden();
  }

  async expectStreamNameFieldVisible() {
    await expect(this.page.testSubj.locator('streamsAppRoutingStreamEntryNameField')).toBeVisible();
  }

  async expectPreviewPanelVisible() {
    await expect(this.page.testSubj.locator('routingPreviewPanel')).toBeVisible();
  }

  async expectToastVisible() {
    await expect(this.page.testSubj.locator('toastCloseButton')).toBeVisible();
  }

  async saveRuleOrder() {
    await this.page.getByRole('button', { name: 'Save order' }).click();
  }

  async cancelRuleOrder() {
    await this.page.getByRole('button', { name: 'Cancel' }).click();
  }
}
