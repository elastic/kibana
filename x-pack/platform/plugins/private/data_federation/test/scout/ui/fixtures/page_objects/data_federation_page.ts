/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class DataFederationPage {
  readonly pageTitle;
  readonly tabs;
  readonly dataSourcesTable;
  readonly connectDataSourceButton;
  readonly createDataSourceFlyout;
  readonly createDataSourceFlyoutCancel;

  constructor(private readonly page: ScoutPage) {
    this.pageTitle = page.testSubj.locator('dataSetsPageTitle');
    this.tabs = page.testSubj.locator('dataSetsTabs');
    this.dataSourcesTable = page.testSubj.locator('dataSetsTable');
    this.connectDataSourceButton = page.testSubj.locator('dataSetsCreateButton');
    this.createDataSourceFlyout = page.testSubj.locator('createDataSourceFlyout');
    this.createDataSourceFlyoutCancel = page.testSubj.locator('createDataSourceFlyoutCancel');
  }

  async goto(): Promise<void> {
    await this.page.gotoApp('management/data/data_federation');
    await this.pageTitle.waitFor({ state: 'visible', timeout: 30000 });
  }
}

