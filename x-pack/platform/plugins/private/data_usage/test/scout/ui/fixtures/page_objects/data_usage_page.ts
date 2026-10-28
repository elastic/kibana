/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class DataUsagePage {
  readonly managementCards: Locator;
  readonly managementCard: Locator;
  readonly content: Locator;

  constructor(private readonly page: ScoutPage) {
    this.managementCards = this.page.getByTestId('cards-navigation-page');
    this.managementCard = this.page.getByTestId('app-card-data_usage');
    this.content = this.page.getByTestId('data-usage-page');
  }

  async gotoManagement() {
    await this.page.gotoApp('management');
    await this.managementCards.waitFor();
  }

  async goto() {
    await this.page.gotoApp('management/data/data_usage');
  }
}
