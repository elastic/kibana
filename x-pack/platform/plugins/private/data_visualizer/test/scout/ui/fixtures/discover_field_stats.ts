/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

interface DiscoverClassicNavigator {
  goto(options: { queryMode: 'classic' }): Promise<void>;
  getSelectedDataView(): Locator;
}

interface DiscoverSourceSelector {
  loadSavedSearch(title: string): Promise<void>;
  selectDataView(name: string): Promise<void>;
}

export const gotoDiscoverClassic = async (page: ScoutPage, discover: DiscoverClassicNavigator) => {
  await discover.goto({ queryMode: 'classic' });
  await expect(page.testSubj.locator('queryInput')).toBeVisible({ timeout: 30_000 });
  await expect(discover.getSelectedDataView()).toBeVisible({ timeout: 30_000 });
};

export const selectDiscoverSource = async (
  discover: DiscoverSourceSelector,
  sourceIndexOrSavedSearch: string,
  isSavedSearch?: boolean
) => {
  if (isSavedSearch) {
    await discover.loadSavedSearch(sourceIndexOrSavedSearch);
  } else {
    await discover.selectDataView(sourceIndexOrSavedSearch);
  }
};

const VIEW_MODE_TOGGLE_BUTTON = 'dscViewModeToggleButton';
const VIEW_MODE_TOGGLE_SELECTABLE = 'dscViewModeToggleSelectable';
const VIEW_MODE_FIELD_STATS_OPTION = 'dscViewModeFieldStatsOption';

const waitForDiscoverResultsToSettle = async (page: ScoutPage) => {
  const loadingHits = page.testSubj
    .locator('discoverQueryTotalHits')
    .and(page.locator('[data-fetch-status="loading"]'));
  await loadingHits.waitFor({ state: 'hidden', timeout: 30_000 });
  await page.testSubj.locator('unifiedHistogramRendered').waitFor({ state: 'visible' });
};

const openViewModeMenu = async (page: ScoutPage) => {
  const selectable = page.testSubj.locator(VIEW_MODE_TOGGLE_SELECTABLE);
  if (await selectable.isVisible()) {
    return;
  }

  await page.testSubj.click(VIEW_MODE_TOGGLE_BUTTON);
  await selectable.waitFor({ state: 'visible' });
};

export const assertViewModeToggleNotExists = async (page: ScoutPage) => {
  await expect(page.testSubj.locator(VIEW_MODE_TOGGLE_BUTTON)).toBeHidden({ timeout: 2000 });
};

export const assertViewModeToggleExists = async (page: ScoutPage) => {
  await expect(page.testSubj.locator(VIEW_MODE_TOGGLE_BUTTON)).toBeVisible({ timeout: 2000 });
};

export const assertFieldStatsTableNotExists = async (page: ScoutPage) => {
  await expect(page.locator('[data-test-subj="dscFieldStatsEmbeddedContent"]:visible')).toHaveCount(
    0,
    {
      timeout: 2000,
    }
  );
};

export const assertFieldStatsTabNotExists = async (page: ScoutPage) => {
  await openViewModeMenu(page);
  await expect(page.testSubj.locator(VIEW_MODE_FIELD_STATS_OPTION)).toBeHidden({ timeout: 2000 });
};

export const clickViewModeFieldStatsButton = async (page: ScoutPage) => {
  const fieldStatsContent = page.testSubj.locator('dscFieldStatsEmbeddedContent');
  const fieldStatsOption = page.testSubj.locator(VIEW_MODE_FIELD_STATS_OPTION);

  await waitForDiscoverResultsToSettle(page);

  await expect(async () => {
    if (await fieldStatsContent.isVisible()) {
      return;
    }

    await openViewModeMenu(page);
    await fieldStatsOption.waitFor({ state: 'visible' });
    // Histogram / document-table layout shifts keep this popover option "not
    // stable" for Playwright's actionability check. Dispatch the click once the
    // option is visible, then retry until Field statistics is selected.
    await fieldStatsOption.dispatchEvent('click');
    await fieldStatsContent.waitFor({ state: 'visible', timeout: 10_000 });
  }).toPass({ timeout: 30_000 });
};
