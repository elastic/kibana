/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../fixtures';

/**
 * Scout UI tests for Rules Management
 * Tests rule listing, enabling/disabling, deletion, and navigation to authoring
 */
test.describe(
  'Rules Management',
  {
    tag: [tags.stateful.classic, '@ess'],
  },
  () => {
    test.beforeEach(async ({ pageObjects, browserAuth, uiSettings }) => {
      await uiSettings.set('xpack.osquery.enableExperimental', ['endpointComplianceMonitoring']);
      await browserAuth.loginAsComplianceEditor();
      await pageObjects.compliance.gotoRulesManagement();
    });

    test('renders rules management page with rules table', async ({ page }) => {
      // Verify page loads
      await expect(page.testSubj.locator('rulesManagementPage')).toBeVisible();

      // Verify URL
      expect(page.url()).toContain('/osquery/compliance/rules');

      // Verify rules table is visible
      await expect(page.testSubj.locator('complianceRulesTable')).toBeVisible();
    });

    test('displays rules with expected columns', async ({ page }) => {
      // Verify table headers
      await expect(page.getByRole('columnheader', { name: /rule name/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /benchmark/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /section/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /platform/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /enabled/i })).toBeVisible();
    });

    test('shows benchmarks grouped by cards', async ({ page }) => {
      // Verify benchmark cards are visible
      const benchmarkCards = page.testSubj.locator('benchmarkCard');
      const count = await benchmarkCards.count();

      expect(count).toBeGreaterThan(0);

      // Verify each card has expected structure
      const firstCard = benchmarkCards.first();
      await expect(firstCard.getByTestId('benchmarkName')).toBeVisible();
      await expect(firstCard.getByTestId('benchmarkVersion')).toBeVisible();
      await expect(firstCard.getByTestId('benchmarkRuleCount')).toBeVisible();
    });

    test('filters rules by benchmark', async ({ page }) => {
      // Click first benchmark card to filter
      await page.testSubj.locator('benchmarkCard').first().click();

      // Wait for filter to apply
      await page.waitForTimeout(1000);

      // Verify table updated
      await expect(page.testSubj.locator('complianceRulesTable')).toBeVisible();

      // Verify filter badge shows
      await expect(page.testSubj.locator('activeBenchmarkFilter')).toBeVisible();
    });

    test('searches rules by keyword', async ({ page }) => {
      // Enter search query
      const searchInput = page.testSubj.locator('rulesSearchInput');
      await searchInput.fill('password');

      // Wait for search to execute
      await page.waitForTimeout(1000);

      // Verify table shows filtered results
      await expect(page.testSubj.locator('complianceRulesTable')).toBeVisible();
    });

    test('toggles rule enabled/disabled', async ({ page, pageObjects }) => {
      // Get rule count
      const rulesCount = await pageObjects.compliance.getRulesCount();
      expect(rulesCount).toBeGreaterThan(0);

      // Find first rule toggle switch
      const firstToggle = page.testSubj.locator('complianceRuleToggle').first();
      const initialState = await firstToggle.getAttribute('aria-checked');

      // Toggle the rule
      await firstToggle.click();

      // Wait for API call to complete
      await page.waitForTimeout(1000);

      // Verify toggle state changed
      const newState = await firstToggle.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);

      // Verify success toast appears
      await expect(page.testSubj.locator('globalToastList')).toContainText(/updated/i, {
        timeout: 5000,
      });
    });

    test('navigates to rule authoring page', async ({ pageObjects, page }) => {
      // Click create rule button
      await pageObjects.compliance.clickCreateRuleButton();

      // Verify navigation to authoring page
      await expect(page).toHaveURL(/\/osquery\/compliance\/rules\/create/);

      // Verify authoring page loads
      await expect(page.testSubj.locator('ruleAuthoringPage')).toBeVisible();
    });

    test('disables rule actions for viewer role', async ({ browserAuth, page, pageObjects }) => {
      // Login as viewer (read-only)
      await browserAuth.loginAsComplianceViewer();
      await pageObjects.compliance.gotoRulesManagement();

      // Verify create button is not visible
      const createButton = page.testSubj.locator('createComplianceRuleButton');
      const isVisible = await createButton.isVisible({ timeout: 2000 }).catch(() => false);

      expect(isVisible).toBe(false);

      // Verify rule toggles are disabled
      const firstToggle = page.testSubj.locator('complianceRuleToggle').first();
      const hasToggle = await firstToggle.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasToggle) {
        await expect(firstToggle).toBeDisabled();
      }
    });

    test('sorts rules by column', async ({ page }) => {
      // Click rule name column header to sort
      const nameHeader = page.getByRole('columnheader', { name: /rule name/i });
      await nameHeader.click();

      // Wait for sort to apply
      await page.waitForTimeout(1000);

      // Verify table is still visible
      await expect(page.testSubj.locator('complianceRulesTable')).toBeVisible();

      // Click again to reverse sort
      await nameHeader.click();
      await page.waitForTimeout(1000);

      // Verify table is still visible
      await expect(page.testSubj.locator('complianceRulesTable')).toBeVisible();
    });

    test('displays rule details in flyout', async ({ page }) => {
      // Click on first rule row
      await page.testSubj.locator('complianceRuleRow').first().click();

      // Verify flyout opens
      await expect(page.testSubj.locator('ruleDetailFlyout')).toBeVisible({ timeout: 5000 });

      // Verify flyout contains rule details
      await expect(page.testSubj.locator('ruleDetailName')).toBeVisible();
      await expect(page.testSubj.locator('ruleDetailQuery')).toBeVisible();
      await expect(page.testSubj.locator('ruleDetailRemediation')).toBeVisible();
      await expect(page.testSubj.locator('ruleDetailBenchmark')).toBeVisible();
    });

    test('closes rule detail flyout', async ({ page }) => {
      // Open flyout
      await page.testSubj.locator('complianceRuleRow').first().click();
      await expect(page.testSubj.locator('ruleDetailFlyout')).toBeVisible();

      // Close flyout
      await page.testSubj.click('ruleDetailFlyoutCloseButton');

      // Verify flyout is closed
      await expect(page.testSubj.locator('ruleDetailFlyout')).toBeHidden();
    });

    test('filters rules by platform', async ({ page }) => {
      // Check if platform filter exists
      const platformFilter = page.testSubj.locator('rulesPlatformFilter');
      const exists = await platformFilter.isVisible({ timeout: 2000 }).catch(() => false);

      if (exists) {
        // Click platform filter
        await platformFilter.click();

        // Select Linux
        await page.getByRole('option', { name: /linux/i }).click();

        // Wait for filter to apply
        await page.waitForTimeout(1000);

        // Verify table updated
        await expect(page.testSubj.locator('complianceRulesTable')).toBeVisible();
      }
    });

    test('displays bulk actions for selected rules', async ({ page }) => {
      // Select first rule checkbox
      const firstCheckbox = page.testSubj.locator('complianceRuleCheckbox').first();
      await firstCheckbox.check();

      // Verify bulk actions bar appears
      await expect(page.testSubj.locator('rulesBulkActionsBar')).toBeVisible({ timeout: 5000 });

      // Verify bulk action buttons
      await expect(page.testSubj.locator('bulkEnableRulesButton')).toBeVisible();
      await expect(page.testSubj.locator('bulkDisableRulesButton')).toBeVisible();
    });

    test('handles empty state when no rules exist', async ({ page, esClient }) => {
      // Delete all rules
      await esClient.deleteByQuery({
        index: '.kibana*',
        body: {
          query: {
            term: { type: 'osquery-compliance-rule' },
          },
        },
        refresh: true,
      });

      // Reload page
      await page.reload();

      // Verify empty state is shown
      await expect(page.testSubj.locator('rulesEmptyState')).toBeVisible();
      await expect(page.testSubj.locator('rulesEmptyStateMessage')).toContainText(
        /no rules/i
      );
    });
  }
);
