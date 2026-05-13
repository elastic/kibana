/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class EisModelsPage {
  // Header
  readonly pageHeader: Locator;
  readonly documentationLink: Locator;

  // Search and Filters
  readonly searchBar: Locator;
  readonly modelFamilyFilter: Locator;

  // Model Cards
  readonly allModelCards: Locator;

  // Empty State
  readonly noModelsFound: Locator;

  // Model Detail Flyout
  readonly flyout: Locator;
  readonly flyoutTaskBadges: Locator;
  readonly flyoutModelDetails: Locator;
  readonly flyoutAddEndpointButton: Locator;
  readonly flyoutCloseButton: Locator;
  readonly allEndpointRows: Locator;

  // Add/View Endpoint Modal
  readonly addEndpointModal: Locator;
  readonly addEndpointSaveButton: Locator;
  readonly addEndpointCancelButton: Locator;
  readonly addEndpointCloseButton: Locator;
  readonly addEndpointIdField: Locator;

  constructor(private readonly page: ScoutPage) {
    // Header
    this.pageHeader = this.page.testSubj.locator('eisModelsPageHeader');
    this.documentationLink = this.page.testSubj.locator('eis_documentation');

    // Search and Filters
    this.searchBar = this.page.testSubj.locator('eisModelsSearchBar');
    this.modelFamilyFilter = this.page.testSubj.locator('modelFamilyFilterMultiselect');

    // Model Cards
    this.allModelCards = this.page.testSubj
      .locator('eisModelCards')
      .locator('[data-test-subj^="eisModelCard-"]');

    // Empty State
    this.noModelsFound = this.page.testSubj.locator('eisNoModelsFound');

    // Model Detail Flyout
    this.flyout = this.page.testSubj.locator('modelDetailFlyout');
    this.flyoutTaskBadges = this.page.testSubj.locator('flyoutTaskBadges');
    this.flyoutModelDetails = this.page.testSubj.locator('flyoutModelDetails');
    this.flyoutAddEndpointButton = this.page.testSubj.locator('modelDetailFlyoutAddEndpointButton');
    this.flyoutCloseButton = this.page.testSubj.locator('modelDetailFlyoutCloseButton');
    this.allEndpointRows = this.page.testSubj
      .locator('modelDetailFlyout')
      .locator('[data-test-subj^="endpoint-row-"]');

    // Add/View Endpoint Modal
    this.addEndpointModal = this.page.testSubj.locator('addEndpointModal');
    this.addEndpointSaveButton = this.page.testSubj.locator('addEndpointModalSaveButton');
    this.addEndpointCancelButton = this.page.testSubj.locator('addEndpointModalCancelButton');
    this.addEndpointCloseButton = this.page.testSubj.locator('addEndpointModalCloseButton');
    this.addEndpointIdField = this.page.testSubj.locator('addEndpointIdField');
  }

  // --- Navigation ---

  public async goto() {
    await this.page.gotoApp('management/modelManagement/elastic_inference_service');
    await this.page.testSubj.waitForSelector('eisModelsPageHeader', { state: 'visible' });
  }

  // --- Parameterized Locators ---

  public modelCard(modelName: string): Locator {
    return this.page.testSubj.locator(`eisModelCard-${modelName}`);
  }

  public taskTypeFilter(category: string): Locator {
    return this.page.testSubj.locator(`eisTaskTypeFilter-${category}`);
  }

  public endpointRow(inferenceId: string): Locator {
    return this.page.testSubj.locator(`endpoint-row-${inferenceId}`);
  }

  public deleteEndpointButton(inferenceId: string): Locator {
    return this.page.testSubj.locator(`deleteEndpointButton-${inferenceId}`);
  }
}
