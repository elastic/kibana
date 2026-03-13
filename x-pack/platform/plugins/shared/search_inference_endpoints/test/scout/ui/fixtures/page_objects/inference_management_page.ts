/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class InferenceManagementPage {
  constructor(private readonly page: ScoutPage) {}

  public async goto() {
    await this.page.gotoApp('searchInferenceEndpoints');
    await this.page.testSubj.waitForSelector('allInferenceEndpointsPage');
  }

  // --- Header ---

  public get pageHeader(): Locator {
    return this.page.testSubj.locator('allInferenceEndpointsPage');
  }

  public get eisDocumentationLink(): Locator {
    return this.page.testSubj.locator('eis-documentation');
  }

  public get apiDocumentationLink(): Locator {
    return this.page.testSubj.locator('api-documentation');
  }

  public get viewYourModelsLink(): Locator {
    return this.page.testSubj.locator('view-your-models');
  }

  public get addEndpointButton(): Locator {
    return this.page.testSubj.locator('add-inference-endpoint-header-button');
  }

  // --- Tabular View ---

  public get searchField(): Locator {
    return this.page.testSubj.locator('search-field-endpoints');
  }

  public get typeField(): Locator {
    return this.page.testSubj.locator('type-field-endpoints');
  }

  public get serviceField(): Locator {
    return this.page.testSubj.locator('service-field-endpoints');
  }

  public get endpointTable(): Locator {
    return this.page.testSubj.locator('inferenceEndpointTable');
  }

  public async getTableRows(): Promise<Locator> {
    return this.endpointTable.locator('.euiTableRow');
  }

  public async getModelCells(): Promise<Locator> {
    return this.page.testSubj.locator('modelCell');
  }

  // --- Endpoint Stats ---

  public get endpointStats(): Locator {
    return this.page.testSubj.locator('endpointStats');
  }

  public get modelsCount(): Locator {
    return this.page.testSubj.locator('endpointStatsModelsCount');
  }

  public get endpointsCount(): Locator {
    return this.page.testSubj.locator('endpointStatsEndpointsCount');
  }

  // --- Group By ---

  public get groupBySelect(): Locator {
    return this.page.testSubj.locator('group-by-select');
  }

  public get groupByButton(): Locator {
    return this.page.testSubj.locator('group-by-button');
  }

  public get groupBySelectable(): Locator {
    return this.page.testSubj.locator('group-by-selectable');
  }

  public get groupByTablesContainer(): Locator {
    return this.page.testSubj.locator('group-by-tables-container');
  }

  public async selectGroupByOption(key: string) {
    await this.groupByButton.click();
    await this.groupBySelectable.waitFor({ state: 'visible' });
    await this.page.testSubj.locator(`group-by-option-${key}`).click();
  }

  public getGroupAccordion(groupId: string): Locator {
    return this.page.testSubj.locator(`${groupId}-accordion`);
  }

  public getGroupTable(groupId: string): Locator {
    return this.page.testSubj.locator(`${groupId}-table`);
  }

  public getAccordionToggle(groupId: string): Locator {
    return this.page.locator(`[aria-controls="${groupId}-group-accordion"]`);
  }

  public async toggleGroupAccordion(groupId: string) {
    await this.getAccordionToggle(groupId).click();
  }

  // --- Actions ---

  public getFirstRowActionsButton(): Locator {
    return this.endpointTable
      .locator('.euiTableRow')
      .filter({ has: this.page.testSubj.locator('euiCollapsedItemActionsButton') })
      .locator('[data-test-subj="euiCollapsedItemActionsButton"]');
  }

  public get copyIdAction(): Locator {
    return this.page.testSubj.locator('inference-endpoints-action-copy-id-label');
  }

  public get viewEndpointAction(): Locator {
    return this.page.testSubj.locator('inference-endpoints-action-view-endpoint-label');
  }

  public get preconfiguredDeleteAction(): Locator {
    return this.page.testSubj.locator('inferenceUIDeleteAction-preconfigured');
  }

  // --- Add Inference Flyout ---

  public get inferenceFlyout(): Locator {
    return this.page.testSubj.locator('inference-flyout');
  }

  public get providerSelect(): Locator {
    return this.page.testSubj.locator('provider-select');
  }

  public get providerSearchBox(): Locator {
    return this.page.testSubj.locator('provider-super-select-search-box');
  }

  public get apiKeyPassword(): Locator {
    return this.page.testSubj.locator('api_key-password');
  }

  public get additionalSettingsButton(): Locator {
    return this.page.testSubj.locator('inference-endpoint-additional-settings-button');
  }

  public get endpointInputField(): Locator {
    return this.page.testSubj.locator('inference-endpoint-input-field');
  }

  public get submitButton(): Locator {
    return this.page.testSubj.locator('inference-endpoint-submit-button');
  }

  public getTaskTypeOption(taskType: string): Locator {
    return this.page.testSubj.locator(taskType);
  }

  public getProviderOption(provider: string): Locator {
    return this.page.testSubj.locator(`${provider}-provider`);
  }

  // --- Custom Headers (Add Flyout) ---

  public get moreOptionsAccordion(): Locator {
    return this.page.testSubj.locator('inference-endpoint-more-options');
  }

  public get moreOptionsAccordionButton(): Locator {
    return this.page.testSubj.locator('inference-endpoint-more-options-accordion-button');
  }

  public get headersSwitchUnchecked(): Locator {
    return this.page.testSubj.locator('headers-switch-unchecked');
  }

  public get headersSwitchChecked(): Locator {
    return this.page.testSubj.locator('headers-switch-checked');
  }

  public get headersAddButton(): Locator {
    return this.page.testSubj.locator('headers-add-button');
  }

  public getHeaderKeyInput(index: number): Locator {
    return this.page.testSubj.locator(`headers-key-${index}`);
  }

  public getHeaderValueInput(index: number): Locator {
    return this.page.testSubj.locator(`headers-value-${index}`);
  }

  public getHeaderDeleteButton(index: number): Locator {
    return this.page.testSubj.locator(`headers-delete-button-${index}`);
  }

  // --- Edit Inference Flyout ---

  public get modelIdInput(): Locator {
    return this.page.testSubj.locator('model_id-input');
  }

  // --- Embedded Console ---

  public get consoleControlBar(): Locator {
    return this.page.testSubj.locator('consoleEmbeddedSection');
  }

  public get consoleBody(): Locator {
    return this.page.testSubj.locator('consoleEmbeddedBody');
  }

  public get consoleEmbeddedControlBar(): Locator {
    return this.page.testSubj.locator('consoleEmbeddedControlBar');
  }

  public get consoleFullscreenToggle(): Locator {
    return this.page.testSubj.locator('consoleToggleFullscreenButton');
  }

  public async clickConsoleControlBar() {
    await this.consoleEmbeddedControlBar.click();
  }
}
