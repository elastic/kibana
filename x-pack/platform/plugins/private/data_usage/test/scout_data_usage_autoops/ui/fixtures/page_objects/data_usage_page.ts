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
  readonly metrics: Locator;
  readonly renderedCharts: Locator;
  readonly ingestRateChart: Locator;
  readonly storageRetainedChart: Locator;
  readonly copyDataStreamNameAction: Locator;
  readonly manageDataStreamAction: Locator;
  readonly datasetQualityAction: Locator;

  constructor(private readonly page: ScoutPage) {
    this.managementCards = this.page.getByTestId('cards-navigation-page');
    this.managementCard = this.page.getByTestId('app-card-data_usage');
    this.content = this.page.getByTestId('data-usage-page');
    this.metrics = this.page.getByTestId('data-usage-metrics');
    // eslint-disable-next-line playwright/no-raw-locators -- elastic-charts exposes its render state only via this attribute
    this.renderedCharts = this.metrics.locator('[data-ech-render-complete="true"]');
    this.ingestRateChart = this.page.getByTestId('ingest_rate-chart');
    this.storageRetainedChart = this.page.getByTestId('storage_retained-chart');
    this.copyDataStreamNameAction = this.page.getByTestId('copyDataStreamNameAction');
    this.manageDataStreamAction = this.page.getByTestId('manageDataStreamAction');
    this.datasetQualityAction = this.page.getByTestId('DatasetQualityAction');
  }

  async gotoManagement() {
    await this.page.gotoApp('management');
    await this.managementCards.waitFor();
  }

  async goto() {
    await this.page.gotoApp('management/data/data_usage');
    await this.content.waitFor();
  }

  legendItems(chart: Locator) {
    return chart.getByRole('listitem');
  }

  async openLegendActions(chart: Locator, dataStreamName: string) {
    await this.legendItems(chart)
      .filter({ hasText: dataStreamName })
      .getByTestId('legendActionButton')
      .click();
    await this.copyDataStreamNameAction.waitFor();
  }
}
