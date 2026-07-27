/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Source selection for Index Data Visualizer / Data Drift.
 *
 * Data view path:
 *   mlDataSourceSelectorButton → indexPattern-switcher--input → li[role=option][data-test-subj=dataView-…]
 *
 * Discover session (saved search) path:
 *   mlOpenDiscoverSessionButton → loadSearchForm → savedObjectFinderSearchInput →
 *   button[data-test-subj=savedObjectTitle…]
 */
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

    const switcher = this.page.testSubj.locator('indexPattern-switcher');
    await switcher.waitFor({ state: 'visible' });

    const searchInput = this.page.testSubj.locator('indexPattern-switcher--input');
    if (await searchInput.isVisible()) {
      await searchInput.fill(name);
    }

    // EUI selectable option, e.g. data-test-subj="dataView-Kibana Sample Data Logs"
    const option = switcher.locator(`li[role="option"][data-test-subj="dataView-${name}"]`);
    await option.waitFor({ state: 'visible', timeout: 40_000 });
    await option.click();

    await switcher.waitFor({ state: 'hidden' });
    await this.page.waitForURL(/index=/);
    await this.page.testSubj.locator(nextPageSubj).waitFor({ state: 'visible' });
  }

  private async selectSavedSearch(name: string, nextPageSubj: string) {
    const loadSearchForm = this.page.testSubj.locator('loadSearchForm');

    // Close any leftover Discover-session flyout before opening a new one.
    if (await loadSearchForm.isVisible()) {
      await this.page.keyboard.press('Escape');
      await loadSearchForm.waitFor({ state: 'hidden' });
    }

    await this.page.testSubj.click('mlOpenDiscoverSessionButton');
    await loadSearchForm.waitFor({ state: 'visible' });

    const searchInput = this.page.testSubj.locator('savedObjectFinderSearchInput');
    await searchInput.waitFor({ state: 'visible' });

    // SavedObjectFinder fetches asynchronously on open — wait for the table to settle.
    await this.page.testSubj
      .locator('savedObjectsFinderTable')
      .locator('table:not([aria-busy="true"])')
      .waitFor({ state: 'visible', timeout: 40_000 });

    if (await searchInput.isVisible()) {
      await searchInput.fill(name);
    }

    // Result button, e.g. data-test-subj="savedObjectTitleTest-bytes->-5000"
    // (HTML may encode ">" as &gt; in markup; the DOM attribute value is the decoded title.)
    const resultItem = this.page.locator(`button[data-test-subj="savedObjectTitle${name}"]`);
    await resultItem.waitFor({ state: 'visible', timeout: 40_000 });
    await resultItem.click();

    await loadSearchForm.waitFor({ state: 'hidden' });
    await this.page.waitForURL(/savedSearchId/);
    await this.page.testSubj.locator(nextPageSubj).waitFor({ state: 'visible' });
  }
}
