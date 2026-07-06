/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

interface DiscoverSourceSelector {
  loadSavedSearch(title: string): Promise<void>;
  selectDataView(name: string): Promise<void>;
}

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

export const assertViewModeToggleNotExists = async (page: ScoutPage) => {
  await expect(page.testSubj.locator('dscViewModeToggle')).toBeHidden({ timeout: 2000 });
};

export const assertViewModeToggleExists = async (page: ScoutPage) => {
  await expect(page.testSubj.locator('dscViewModeToggle')).toBeVisible({ timeout: 2000 });
};

export const assertFieldStatsTableNotExists = async (page: ScoutPage) => {
  await expect(page.locator('[data-test-subj="dscFieldStatsEmbeddedContent"]:visible')).toHaveCount(
    0,
    {
      timeout: 2000,
    }
  );
};

export const clickViewModeFieldStatsButton = async (page: ScoutPage) => {
  const fieldStatsButton = page.testSubj.locator('dscViewModeFieldStatsButton');
  await expect(fieldStatsButton).toBeVisible({ timeout: 2000 });
  await fieldStatsButton.click();
  await expect(page.testSubj.locator('dscFieldStatsEmbeddedContent')).toBeVisible({
    timeout: 2000,
  });
};
