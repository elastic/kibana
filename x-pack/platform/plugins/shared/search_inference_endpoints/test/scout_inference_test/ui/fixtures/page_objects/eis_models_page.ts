/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class EisModelsPage {
  readonly pageHeader: Locator;
  readonly documentationLink: Locator;

  constructor(private readonly page: ScoutPage) {
    this.pageHeader = this.page.testSubj.locator('eisModelsPageHeader');
    this.documentationLink = this.page.testSubj.locator('eis_documentation');
  }

  public async goto() {
    await this.page.gotoApp('management/modelManagement/elastic_inference_service');
    await this.page.testSubj.waitForSelector('eisModelsPageHeader', { state: 'visible' });
  }
}
