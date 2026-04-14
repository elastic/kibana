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

  constructor(private readonly page: ScoutPage) {
    // Header
    this.pageHeader = this.page.testSubj.locator('eisModelsPageHeader');
    this.documentationLink = this.page.testSubj.locator('eis_documentation');

    // Search and Filters
    this.searchBar = this.page.testSubj.locator('eisModelsSearchBar');
    this.modelFamilyFilter = this.page.testSubj.locator('modelFamilyFilterMultiselect');

    // Model Cards
    this.allModelCards = this.page.locator('[data-test-subj^="eisModelCard-"]');

    // Empty State
    this.noModelsFound = this.page.testSubj.locator('eisNoModelsFound');
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
}
