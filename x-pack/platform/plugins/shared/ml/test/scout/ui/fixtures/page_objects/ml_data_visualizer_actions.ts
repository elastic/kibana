/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

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
    await this.page.testSubj.waitForSelector('indexPattern-switcher', { state: 'visible' });

    await this.page.testSubj.fill('indexPattern-switcher--input', name);
    await this.page.locator(`[data-test-subj="dataView-${name}"]`).click();
    await this.page.testSubj.waitForSelector('indexPattern-switcher', { state: 'hidden' });

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

    await this.savedObjectFinderSearchInput.fill(name);
    await this.page.testSubj.click(`savedObjectTitle${name}`);
    await this.loadSearchForm.waitFor({ state: 'hidden' });

    await this.page.waitForURL(/savedSearchId/, { timeout: 10_000 });

    await this.page.testSubj.waitForSelector('dataVisualizerIndexPage', { state: 'visible' });
  }

  async clickUseFullDataButton(): Promise<void> {
    await this.useFullDataButton.click();
    await this.applyTimeButton.click();
    await this.totalDocCount.waitFor({ state: 'visible' });
  }

  async clickCreateAdvancedJobButton(): Promise<void> {
    await this.createAdvancedJobCard.click();
  }

  async clickViewInDiscoverButton(): Promise<void> {
    await this.viewInDiscoverCard.click();
  }
}
