/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class MlDataVisualizerActions {
  readonly actionsPanel: Locator;
  readonly createAdvancedJobCard: Locator;
  readonly createDataFrameAnalyticsCard: Locator;
  readonly viewInDiscoverCard: Locator;
  readonly timeRangeSelectorSection: Locator;
  readonly totalDocCount: Locator;

  private readonly useFullDataButton: Locator;
  private readonly applyTimeButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.actionsPanel = this.page.testSubj.locator('dataVisualizerActionsPanel');
    this.createAdvancedJobCard = this.page.testSubj.locator('dataVisualizerCreateAdvancedJobCard');
    this.createDataFrameAnalyticsCard = this.page.testSubj.locator(
      'dataVisualizerCreateDataFrameAnalyticsCard'
    );
    this.viewInDiscoverCard = this.page.testSubj.locator('dataVisualizerViewInDiscoverCard');
    this.timeRangeSelectorSection = this.page.testSubj.locator(
      'dataVisualizerTimeRangeSelectorSection'
    );
    this.totalDocCount = this.page.testSubj.locator('dataVisualizerTotalDocCount');

    this.useFullDataButton = this.page.testSubj.locator('mlDatePickerButtonUseFullData');
    this.applyTimeButton = this.page.testSubj.locator('superDatePickerApplyTimeButton');
  }

  /**
   * Opens the index data visualizer on the given data source, deep linking the same
   * `index` / `savedSearchId` query param the in-app data source picker writes.
   */
  async navigateToIndexDataVisualizer(
    source: { index: string } | { savedSearchId: string }
  ): Promise<void> {
    await this.page.gotoApp('ml/jobs/new_job/datavisualizer', { params: source });
    await this.page.testSubj.waitForSelector('dataVisualizerIndexPage', { state: 'visible' });
  }

  /**
   * Applies the full data time range. Retries like DV Scout / FTR — saved-search
   * filters can race with the initial load so the first apply may leave total docs at 0.
   */
  async clickUseFullDataButton(expectedFormattedTotalDocCount: string): Promise<void> {
    await expect(async () => {
      await expect(this.useFullDataButton).toBeEnabled({ timeout: 10_000 });
      await this.useFullDataButton.click();
      await expect(this.applyTimeButton).toBeEnabled({ timeout: 10_000 });
      await this.applyTimeButton.click();
      await expect(this.totalDocCount).toHaveText(expectedFormattedTotalDocCount, {
        timeout: 10_000,
      });
    }).toPass({ timeout: 60_000 });
  }

  async clickCreateAdvancedJobButton(): Promise<void> {
    await this.createAdvancedJobCard.click();
  }

  async clickViewInDiscoverButton(): Promise<void> {
    await this.viewInDiscoverCard.click();
  }
}
