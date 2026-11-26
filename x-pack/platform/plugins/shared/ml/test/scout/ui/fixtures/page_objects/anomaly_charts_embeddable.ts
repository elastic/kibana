/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class AnomalyChartsEmbeddablePage {
  readonly initializer: Locator;
  readonly maxSeriesInput: Locator;
  readonly confirmButton: Locator;
  readonly severityControl: Locator;
  readonly chartsContainer: Locator;

  constructor(private readonly page: ScoutPage) {
    this.initializer = this.page.testSubj.locator('mlAnomalyChartsEmbeddableInitializer');
    this.maxSeriesInput = this.page.testSubj.locator('mlAnomalyChartsInitializerMaxSeries');
    this.confirmButton = this.page.testSubj.locator('mlAnomalyChartsInitializerConfirmButton');
    this.severityControl = this.page.testSubj.locator('mlAnomalySeverityThresholdControls');
    this.chartsContainer = this.page.testSubj.locator('mlExplorerChartsContainer');
  }

  async openInitializer(): Promise<void> {
    await this.page.testSubj.locator('dashboardAddTopNavButton').click();
    await this.page.testSubj.locator('dashboardPanelSelectionFlyout').waitFor({ state: 'visible' });
    await this.page.testSubj
      .locator('dashboardPanelSelectionFlyout__searchInput')
      .fill('Anomaly chart');
    await this.page.testSubj.click('create-action-Anomaly chart');
    await this.page.testSubj.locator('dashboardPanelSelectionFlyout').waitFor({ state: 'hidden' });
    await this.page.testSubj.locator('mlAnomalyJobSelectionControls').waitFor({ state: 'visible' });
  }

  async selectJob(jobId: string): Promise<void> {
    await this.page.components.comboBox('mlAnomalyAlertJobSelection').setSelectedOptions([jobId]);
  }

  async selectedJobs(): Promise<string[]> {
    return this.page.components.comboBox('mlAnomalyAlertJobSelection').getSelectedOptions();
  }

  async confirm(): Promise<void> {
    await this.confirmButton.click();
    await this.initializer.waitFor({ state: 'hidden' });
  }
}
