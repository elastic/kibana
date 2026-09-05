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

  private readonly dataVisualizerTab: Locator;
  private readonly dataVisualizerSelectIndexButton: Locator;
  private readonly dataSourceSelectorButton: Locator;
  private readonly openDiscoverSessionButton: Locator;
  private readonly useFullDataButton: Locator;
  private readonly applyTimeButton: Locator;
  private readonly loadSearchForm: Locator;
  private readonly savedObjectFinderSearchInput: Locator;

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

    this.dataVisualizerTab = this.page.locator(
      '[data-test-subj~="mlMainTab"][data-test-subj~="dataVisualizer"]'
    );
    this.dataVisualizerSelectIndexButton = this.page.testSubj.locator(
      'mlDataVisualizerSelectIndexButton'
    );
    this.dataSourceSelectorButton = this.page.testSubj.locator('mlDataSourceSelectorButton');
    this.openDiscoverSessionButton = this.page.testSubj.locator('mlOpenDiscoverSessionButton');
    this.useFullDataButton = this.page.testSubj.locator('mlDatePickerButtonUseFullData');
    this.applyTimeButton = this.page.testSubj.locator('superDatePickerApplyTimeButton');
    this.loadSearchForm = this.page.testSubj.locator('loadSearchForm');
    this.savedObjectFinderSearchInput = this.page.testSubj.locator('savedObjectFinderSearchInput');
  }

  async navigateToMl(): Promise<void> {
    await this.page.gotoApp('ml');
    await this.page.testSubj.waitForSelector('mlApp', { state: 'visible' });
  }

  async navigateToDataVisualizer(): Promise<void> {
    await this.navigateToMl();
    await this.dataVisualizerTab.click();
    await this.page.testSubj.waitForSelector('mlPageDataVisualizerSelector', { state: 'visible' });
  }

  async navigateToDataViewSelection(): Promise<void> {
    await this.dataVisualizerSelectIndexButton.click();
    await this.dataSourceSelectorButton.waitFor({ state: 'visible' });
  }

  async selectDataView(name: string): Promise<void> {
    await this.dataSourceSelectorButton.click();

    const switcher = this.page.testSubj.locator('indexPattern-switcher');
    await switcher.waitFor({ state: 'visible' });

    const searchInput = this.page.testSubj.locator('indexPattern-switcher--input');
    if (await searchInput.isVisible()) {
      await searchInput.fill(name);
    }

    const option = switcher.locator(`li[role="option"][data-test-subj="dataView-${name}"]`);
    await option.waitFor({ state: 'visible', timeout: 40_000 });
    await option.click();

    await switcher.waitFor({ state: 'hidden' });
    await this.page.waitForURL(/index=/, { timeout: 10_000 });
    await this.page.testSubj.waitForSelector('dataVisualizerIndexPage', { state: 'visible' });
  }

  async selectSavedSearch(name: string): Promise<void> {
    if (await this.loadSearchForm.isVisible()) {
      await this.page.keyboard.press('Escape');
      await this.loadSearchForm.waitFor({ state: 'hidden' });
    }

    await this.openDiscoverSessionButton.click();
    await this.loadSearchForm.waitFor({ state: 'visible' });
    await this.savedObjectFinderSearchInput.waitFor({ state: 'visible' });

    // SavedObjectFinder fires an async fetch on mount; wait for the initial load to settle.
    await this.page.testSubj
      .locator('savedObjectsFinderTable')
      .locator('table:not([aria-busy="true"])')
      .waitFor({ state: 'visible', timeout: 40_000 });

    if (await this.savedObjectFinderSearchInput.isVisible()) {
      await this.savedObjectFinderSearchInput.fill(name);
    }

    const resultItem = this.page.locator(`button[data-test-subj="savedObjectTitle${name}"]`);
    await resultItem.waitFor({ state: 'visible', timeout: 40_000 });
    await resultItem.click();
    await this.loadSearchForm.waitFor({ state: 'hidden' });

    await this.page.waitForURL(/savedSearchId/, { timeout: 10_000 });
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
