/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/no-nth-methods */
// `first()` is used to pick a representative solution filter from a list of
// EuiContextMenu items that all share the `quick-filters-item-* rule types`
// data-test-subj suffix. The exact identity of the picked filter doesn't
// matter — only that *some* solution-rule-type filter is applied — so a
// positional locator is the right tool.

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const STACK_ALERTS_PATH = '/app/management/insightsAndAlerting/triggersActionsAlerts';

// Quick-filter context-menu items that target a specific solution carry
// data-test-subj `quick-filters-item-{Solution} rule types` (see
// `alerts_search_bar.tsx`). The `[data-test-subj$=" rule types"]` selector
// matches those filter items only — not the other quick-filter entries.
const SOLUTION_FILTER_SUFFIX = ' rule types';

test.describe('Stack alerts page (admin)', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get(STACK_ALERTS_PATH));
  });

  test('loads the page with the Alerts heading', async ({ page }) => {
    await expect(page.testSubj.locator('appTitle')).toHaveText('Alerts');
  });

  test('shows all solution quick filters', async ({ page }) => {
    await page.testSubj.click('showQueryBarMenu');
    const menu = page.testSubj.locator('queryBarMenuPanel');
    await expect(menu).toBeVisible();

    const solutionFilters = menu.locator(`[data-test-subj$="${SOLUTION_FILTER_SUFFIX}"]`);
    await expect(solutionFilters).toHaveCount(4);
  });

  test('applies a quick filter when clicked', async ({ page }) => {
    await page.testSubj.click('showQueryBarMenu');
    const menu = page.testSubj.locator('queryBarMenuPanel');

    const firstSolutionFilter = menu
      .locator(`[data-test-subj$="${SOLUTION_FILTER_SUFFIX}"]`)
      .first();
    const filterLabel = (await firstSolutionFilter.textContent()) ?? '';
    await firstSolutionFilter.click();

    const appliedFilters = page.locator('[data-test-subj="filter-items-group"] > *');
    await expect(appliedFilters).toHaveCount(1);
    await expect(appliedFilters).toContainText(filterLabel.trim());
  });

  test('disables the non-SIEM solution filters when Security is applied', async ({ page }) => {
    await page.testSubj.click('showQueryBarMenu');
    const menu = page.testSubj.locator('queryBarMenuPanel');
    await expect(menu).toBeVisible();

    await menu
      .locator(`[data-test-subj="quick-filters-item-Security${SOLUTION_FILTER_SUFFIX}"]`)
      .click();

    // Applying a quick filter keeps the menu open and updates the disabled states
    // in place; the non-Security solution filters are present but all disabled
    // (they're mutually exclusive with SIEM). toHaveCount auto-retries while the
    // applied-filter state propagates.
    const nonSecuritySelector = `[data-test-subj$="${SOLUTION_FILTER_SUFFIX}"]:not([data-test-subj*="Security"])`;
    await expect(menu.locator(nonSecuritySelector)).not.toHaveCount(0);
    await expect(menu.locator(`${nonSecuritySelector}:not([disabled])`)).toHaveCount(0);
  });

  test('disables the SIEM solution filter when any other is applied', async ({ page }) => {
    await page.testSubj.click('showQueryBarMenu');
    const menu = page.testSubj.locator('queryBarMenuPanel');
    await expect(menu).toBeVisible();

    const firstNonSecurityFilter = menu
      .locator(`[data-test-subj$="${SOLUTION_FILTER_SUFFIX}"]:not([data-test-subj*="Security"])`)
      .first();
    await firstNonSecurityFilter.click();

    // Applying a quick filter keeps the menu open and disables the SIEM filter in
    // place (exclusive with the other solutions). toBeDisabled auto-retries while
    // the applied-filter state propagates.
    const securityFilter = menu.locator(
      `[data-test-subj="quick-filters-item-Security${SOLUTION_FILTER_SUFFIX}"]`
    );
    await expect(securityFilter).toBeDisabled();
  });
});
