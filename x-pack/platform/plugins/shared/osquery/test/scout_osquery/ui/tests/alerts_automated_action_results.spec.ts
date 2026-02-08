/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable playwright/no-nth-methods */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';
import { socManagerRole } from '../../common/roles';
import { loadRule, cleanupRule } from '../../common/api_helpers';
import { waitForPageReady } from '../../common/constants';

const UUID_REGEX = '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}';

test.describe('Alert Flyout Automated Action Results', { tag: ['@ess', '@svlSecurity'] }, () => {
  let ruleId: string;

  test.beforeAll(async ({ kbnClient }) => {
    const rule = await loadRule(kbnClient, true); // true for response actions
    ruleId = rule.id;
  });

  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginWithCustomRole(socManagerRole);
    // Navigate to the rule and wait for alerts
    await page.goto(kbnUrl.get(`/app/security/rules/id/${ruleId}`));
    await waitForPageReady(page);
    await expect(page.testSubj.locator('expand-event').first()).toBeVisible({ timeout: 120_000 });
  });

  test.afterAll(async ({ kbnClient }) => {
    await cleanupRule(kbnClient, ruleId);
  });

  test('can visit discover from response action results', { tag: ['@ess'] }, async ({ page }) => {
    test.setTimeout(180_000); // Alert tests can take time
    const discoverRegex = new RegExp(`action_id: ${UUID_REGEX}`);

    await page.testSubj.locator('expand-event').first().click();
    await page.testSubj.locator('securitySolutionFlyoutResponseSectionHeader').click();
    await page.testSubj.locator('securitySolutionFlyoutResponseButton').click();
    await expect(page.testSubj.locator('responseActionsViewWrapper')).toBeVisible();

    // Check action items exist
    await expect(page.getByText('View in Discover').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('View in Lens').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Add to Case').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Add to Timeline investigation').first()).toBeVisible({
      timeout: 30_000,
    });

    const discoverLink = page.getByRole('link', { name: 'View in Discover' }).first();
    await expect(discoverLink).toBeVisible({ timeout: 30_000 });
    const href = discoverLink;
    await expect(href).toHaveAttribute('href');

    if (href) {
      // href is relative, need to construct absolute URL
      const baseUrl = new URL(page.url()).origin;
      await page.goto(`${baseUrl}${href}`);
      await waitForPageReady(page);
      // eslint-disable-next-line playwright/no-conditional-expect
      await expect(page.testSubj.locator('discoverDocTable')).toBeVisible({ timeout: 60_000 });
      // eslint-disable-next-line playwright/no-conditional-expect
      await expect(page.getByText(/action_data\.query\s*.+;/).first()).toBeVisible();
      // eslint-disable-next-line playwright/no-conditional-expect
      await expect(page.getByText(discoverRegex).first()).toBeVisible();
    }
  });

  test('can visit lens from response action results', { tag: ['@ess'] }, async ({ page }) => {
    test.setTimeout(180_000); // Alert tests can take time
    const lensRegex = new RegExp(`Action ${UUID_REGEX} results`);

    await page.testSubj.locator('expand-event').first().click();
    await page.testSubj.locator('securitySolutionFlyoutResponseSectionHeader').click();
    await page.testSubj.locator('securitySolutionFlyoutResponseButton').click();
    await expect(page.testSubj.locator('responseActionsViewWrapper')).toBeVisible();

    // Check action items exist
    await expect(page.getByText('View in Discover').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('View in Lens').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Add to Case').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Add to Timeline investigation').first()).toBeVisible({
      timeout: 30_000,
    });

    const firstResultComment = page.testSubj.locator('osquery-results-comment').first();
    const lensButton = firstResultComment.locator('[aria-label="View in Lens"]');

    // Set up a listener for new pages
    const [newPage] = await Promise.all([page.context().waitForEvent('page'), lensButton.click()]);

    // Wait for the new page to load
    await newPage.waitForLoadState();
    await expect(newPage.locator('[data-test-subj="lnsWorkspace"]')).toBeVisible();
    await expect(
      newPage.locator('[data-test-subj="breadcrumbs"]').getByText(lensRegex)
    ).toBeVisible();

    await newPage.close();
  });

  test(
    'can add to timeline from response action results',
    { tag: ['@ess', '@svlSecurity'] },
    async ({ page }) => {
      test.setTimeout(180_000); // Alert tests can take time
      const timelineRegex = new RegExp(`Added ${UUID_REGEX} to Timeline`);
      const filterRegex = new RegExp(`action_id: "${UUID_REGEX}"`);

      await page.testSubj.locator('expand-event').first().click();
      await page.testSubj.locator('securitySolutionFlyoutResponseSectionHeader').click();
      await page.testSubj.locator('securitySolutionFlyoutResponseButton').click();
      await expect(page.testSubj.locator('responseActionsViewWrapper')).toBeVisible();

      // Check action items exist
      await expect(page.getByText('View in Discover').first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('View in Lens').first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('Add to Case').first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('Add to Timeline investigation').first()).toBeVisible({
        timeout: 30_000,
      });

      const firstResultComment = page.testSubj.locator('osquery-results-comment').first();
      const firstTableRow = firstResultComment.locator('.euiTableRow').first();
      await firstTableRow.locator('[data-test-subj="add-to-timeline"]').click();

      await expect(page.getByText(timelineRegex)).toBeVisible();
      await page.testSubj.locator('securitySolutionFlyoutNavigationCollapseDetailButton').click();
      await page.testSubj.locator('timeline-bottom-bar').getByText('Untitled timeline').click();
      await expect(page.getByText(filterRegex)).toBeVisible();
    }
  );
});
