/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class ExternalInferencePage {
  readonly pageHeader: Locator;
  readonly apiDocumentationLink: Locator;
  readonly addEndpointHeaderButton: Locator;

  readonly emptyPrompt: Locator;
  readonly emptyPromptAddButton: Locator;
  readonly emptyPromptDocumentationLink: Locator;

  readonly managementContainer: Locator;
  readonly endpointsTable: Locator;
  readonly searchField: Locator;
  readonly serviceFilter: Locator;
  readonly taskTypeFilter: Locator;
  readonly allEndpointCells: Locator;
  readonly allProviderCells: Locator;
  readonly allModelCells: Locator;

  readonly endpointStats: Locator;
  readonly endpointStatsEndpointsCount: Locator;
  readonly endpointStatsModelsCount: Locator;

  readonly groupBySelect: Locator;
  readonly groupByButton: Locator;

  readonly inferenceFlyout: Locator;

  constructor(private readonly page: ScoutPage) {
    this.pageHeader = this.page.testSubj.locator('externalInferenceHeader');
    this.apiDocumentationLink = this.page.testSubj.locator('api-documentation');
    this.addEndpointHeaderButton = this.page.testSubj.locator(
      'add-inference-endpoint-header-button'
    );

    this.emptyPrompt = this.page.testSubj.locator('externalInferenceEmptyPrompt');
    this.emptyPromptAddButton = this.page.testSubj.locator('addEndpointButton');
    this.emptyPromptDocumentationLink = this.page.testSubj.locator('viewDocumentationLink');

    this.managementContainer = this.page.testSubj.locator('inferenceManagementPage');
    this.endpointsTable = this.page.testSubj.locator('inferenceEndpointTable');
    this.searchField = this.page.testSubj.locator('search-field-endpoints');
    this.serviceFilter = this.page.testSubj.locator('service-field-endpoints');
    this.taskTypeFilter = this.page.testSubj.locator('type-field-endpoints');
    this.allEndpointCells = this.page.testSubj.locator('endpointCell');
    this.allProviderCells = this.page.testSubj.locator('providerCell');
    this.allModelCells = this.page.testSubj.locator('modelCell');

    this.endpointStats = this.page.testSubj.locator('endpointStats');
    this.endpointStatsEndpointsCount = this.page.testSubj.locator('endpointStatsEndpointsCount');
    this.endpointStatsModelsCount = this.page.testSubj.locator('endpointStatsModelsCount');

    this.groupBySelect = this.page.testSubj.locator('group-by-select');
    this.groupByButton = this.page.testSubj.locator('group-by-button');

    this.inferenceFlyout = this.page.testSubj.locator('inference-flyout');
  }

  public async goto() {
    await this.page.gotoApp('management/modelManagement/inference_endpoints');
    await this.page.testSubj.waitForSelector('externalInferenceHeader', { state: 'visible' });
  }

  public async gotoEmptyState() {
    await this.page.gotoApp('management/modelManagement/inference_endpoints');
    await this.page.testSubj.waitForSelector('externalInferenceEmptyPrompt', {
      state: 'visible',
    });
  }

  public endpointCell(inferenceId: string): Locator {
    return this.allEndpointCells.filter({ hasText: inferenceId });
  }

  public async openRowActionsFor(inferenceId: string) {
    const row = this.endpointCell(inferenceId).locator('xpath=ancestor::tr');
    await row.locator('[data-test-subj="euiCollapsedItemActionsButton"]').click();
    await this.page.testSubj.waitForSelector('inference-endpoints-action-view-endpoint-label', {
      state: 'visible',
    });
  }

  public get viewEndpointAction(): Locator {
    return this.page.testSubj.locator('inference-endpoints-action-view-endpoint-label');
  }

  public get deleteActionUserDefined(): Locator {
    return this.page.testSubj.locator('inferenceUIDeleteAction-user-defined');
  }

  public async selectGroupBy(key: 'none' | 'service') {
    await this.groupByButton.click();
    await this.page.testSubj.waitForSelector('group-by-selectable', { state: 'visible' });
    await this.page.testSubj.locator(`group-by-option-${key}`).click();
  }
}
