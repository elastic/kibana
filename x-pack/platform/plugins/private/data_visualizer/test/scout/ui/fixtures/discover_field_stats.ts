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

const openViewModeMenu = async (page: ScoutPage) => {
  await page.testSubj.click(VIEW_MODE_TOGGLE_BUTTON);
  await page.testSubj.locator(VIEW_MODE_TOGGLE_SELECTABLE).waitFor({ state: 'visible' });
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
  await openViewModeMenu(page);
  await page.testSubj.click(VIEW_MODE_FIELD_STATS_OPTION);
  await expect(page.testSubj.locator('dscFieldStatsEmbeddedContent')).toBeVisible({
    timeout: 2000,
  });
};
