/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { waitForKibanaLoadingToFinish } from '../kibana_loading';

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
    const switcher = this.page.testSubj.locator('indexPattern-switcher');
    const selectorButton = this.page.testSubj.locator('mlDataSourceSelectorButton');

    // Retry open + select: the popover can miss the first click while the empty-state
    // picker settles, and the option may lag briefly after data-view create.
    await expect(async () => {
      if (await switcher.isVisible()) {
        await this.page.keyboard.press('Escape');
        await switcher.waitFor({ state: 'hidden' });
      }

      await expect(selectorButton).toBeVisible({ timeout: 10_000 });
      await selectorButton.click();

      await this.page.testSubj
        .locator('changeDataViewPopover')
        .waitFor({ state: 'visible', timeout: 10_000 });
      await switcher.waitFor({ state: 'visible', timeout: 10_000 });

      const searchInput = this.page.testSubj.locator('indexPattern-switcher--input');
      await searchInput.waitFor({ state: 'visible', timeout: 10_000 });
      await searchInput.fill(name);

      // EUI selectable option, e.g. data-test-subj="dataView-Kibana Sample Data Logs"
      const option = switcher.locator(`li[role="option"][data-test-subj="dataView-${name}"]`);
      await option.waitFor({ state: 'visible', timeout: 15_000 });
      await option.click();

      await switcher.waitFor({ state: 'hidden', timeout: 10_000 });
    }).toPass({ timeout: 60_000 });

    await this.page.waitForURL(/index=/, { timeout: 10_000 });
    await waitForKibanaLoadingToFinish(this.page);
    await this.page.testSubj.locator(nextPageSubj).waitFor({ state: 'visible', timeout: 30_000 });
  }

  private async selectSavedSearch(name: string, nextPageSubj: string) {
    const loadSearchForm = this.page.testSubj.locator('loadSearchForm');

    // Retry open + select: SO finder fetch and flyout open can race.
    await expect(async () => {
      if (await loadSearchForm.isVisible()) {
        await this.page.keyboard.press('Escape');
        await loadSearchForm.waitFor({ state: 'hidden' });
      }

      await this.page.testSubj.click('mlOpenDiscoverSessionButton');
      await loadSearchForm.waitFor({ state: 'visible', timeout: 10_000 });

      const searchInput = this.page.testSubj.locator('savedObjectFinderSearchInput');
      await searchInput.waitFor({ state: 'visible', timeout: 30_000 });

      // SavedObjectFinder fetches asynchronously on open — wait for the table to settle.
      await this.page.testSubj
        .locator('savedObjectsFinderTable')
        .locator('table:not([aria-busy="true"])')
        .waitFor({ state: 'visible', timeout: 40_000 });

      await searchInput.fill(name);

      // Result button, e.g. data-test-subj="savedObjectTitleTest-bytes->-5000"
      // (HTML may encode ">" as &gt; in markup; the DOM attribute value is the decoded title.)
      const resultItem = this.page.locator(`button[data-test-subj="savedObjectTitle${name}"]`);
      await resultItem.waitFor({ state: 'visible', timeout: 40_000 });
      await resultItem.click();

      await loadSearchForm.waitFor({ state: 'hidden', timeout: 10_000 });
    }).toPass({ timeout: 60_000 });

    await this.page.waitForURL(/savedSearchId/, { timeout: 10_000 });
    await waitForKibanaLoadingToFinish(this.page);
    await this.page.testSubj.locator(nextPageSubj).waitFor({ state: 'visible', timeout: 30_000 });
  }
}
