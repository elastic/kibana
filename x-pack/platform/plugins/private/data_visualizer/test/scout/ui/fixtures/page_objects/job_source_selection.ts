/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class JobSourceSelection {
  constructor(private readonly page: ScoutPage) {}

  async selectSourceForIndexBasedDataVisualizer(sourceName: string, isSavedSearch = false) {
    if (isSavedSearch) {
      await this.selectSavedSearch(sourceName, 'dataVisualizerIndexPage');
    } else {
      await this.selectDataView(sourceName, 'dataVisualizerIndexPage');
    }
  }

  async selectSourceForDataDrift(sourceName: string, isSavedSearch = false) {
    if (isSavedSearch) {
      await this.selectSavedSearch(sourceName, 'mlPageDataDrift');
    } else {
      await this.selectDataView(sourceName, 'mlPageDataDrift');
    }
  }

  private async selectDataView(name: string, nextPageSubj: string) {
    await this.page.testSubj.click('mlDataSourceSelectorButton');
    await this.page.testSubj.locator('indexPattern-switcher').waitFor({ state: 'visible' });
    await this.page.testSubj.typeWithDelay('indexPattern-switcher--input', name);
    const dataViewOption = this.page.testSubj
      .locator('indexPattern-switcher')
      .locator(`[data-test-subj="dataView-${name}"]`);
    await dataViewOption.waitFor({ state: 'visible' });
    await dataViewOption.click();
    await this.page.testSubj.locator('indexPattern-switcher').waitFor({ state: 'hidden' });
    await this.page.waitForURL(/index=/);
    await this.page.testSubj.locator(nextPageSubj).waitFor({ state: 'visible' });
  }

  private async selectSavedSearch(name: string, nextPageSubj: string) {
    const loadSearchForm = this.page.testSubj.locator('loadSearchForm');
    if (await loadSearchForm.isVisible()) {
      await this.page.keyboard.press('Escape');
      await loadSearchForm.waitFor({ state: 'hidden' });
    }

    await this.page.testSubj.click('mlOpenDiscoverSessionButton');
    await loadSearchForm.waitFor({ state: 'visible' });
    await this.page.testSubj.locator('savedObjectFinderSearchInput').waitFor({ state: 'visible' });
    await this.page.testSubj.typeWithDelay('savedObjectFinderSearchInput', name);
    await this.page.testSubj.click(`savedObjectTitle${name}`);
    await loadSearchForm.waitFor({ state: 'hidden' });
    await this.page.waitForURL(/savedSearchId/);
    await this.page.testSubj.locator(nextPageSubj).waitFor({ state: 'visible' });
  }
}
