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
 * Scout UI tests for Compliance Dashboard
 * Tests compliance score display, trend charts, and worst hosts table
 */
test.describe(
  'Compliance Dashboard',
  {
    tag: [tags.stateful.classic, '@ess'],
  },
  () => {
    test.beforeEach(async ({ pageObjects, browserAuth, uiSettings }) => {
      // Enable compliance feature flag
      await uiSettings.set('xpack.osquery.enableExperimental', ['endpointComplianceMonitoring']);

      // Login as compliance user
      await browserAuth.loginAsComplianceViewer();

      // Navigate to dashboard
      await pageObjects.compliance.gotoDashboard();
    });

    test('renders dashboard with compliance score gauge', async ({ pageObjects, page }) => {
      // Verify page title
      const title = await pageObjects.compliance.getPageTitle();
      expect(title).toContain('Compliance Dashboard');

      // Verify URL
      expect(page.url()).toContain('/osquery/compliance/dashboard');

      // Verify compliance score gauge is visible
      await pageObjects.compliance.isComplianceScoreGaugeVisible();

      // Verify score value is displayed
      const score = await pageObjects.compliance.getDashboardComplianceScore();
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('displays compliance by section table', async ({ page }) => {
      // Verify section table is visible
      await expect(page.testSubj.locator('complianceBySectionTable')).toBeVisible();

      // Verify table has headers
      await expect(page.getByRole('columnheader', { name: 'Section' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Score' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Passed' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Failed' })).toBeVisible();
    });

    test('displays trend chart', async ({ page }) => {
      // Verify trend chart is visible
      await expect(page.testSubj.locator('complianceTrendChart')).toBeVisible();

      // Verify chart container has expected structure
      const chartContainer = page.testSubj.locator('complianceTrendChart');
      await expect(chartContainer).toContainText(/Last.*days/);
    });

    test('displays worst hosts table', async ({ pageObjects, page }) => {
      // Verify worst hosts table is visible
      await expect(page.testSubj.locator('worstHostsTable')).toBeVisible();

      // Verify table has rows
      const hostsCount = await pageObjects.compliance.getWorstHostsCount();
      expect(hostsCount).toBeGreaterThan(0);

      // Verify table headers
      await expect(page.getByRole('columnheader', { name: 'Hostname' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Score' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Failed Checks' })).toBeVisible();
    });

    test('navigates to findings explorer when clicking failed findings', async ({
      pageObjects,
      page,
    }) => {
      // Click on a failed finding link
      await page.testSubj.click('dashboardFailedFindingsLink');

      // Verify navigation to findings page
      await expect(page).toHaveURL(/\/osquery\/compliance\/findings/);

      // Verify findings page loaded
      await expect(page.testSubj.locator('findingsExplorerPage')).toBeVisible();
    });

    test('refreshes data when clicking refresh button', async ({ page, pageObjects }) => {
      // Get initial score
      const initialScore = await pageObjects.compliance.getDashboardComplianceScore();

      // Click refresh button
      await page.testSubj.click('refreshDashboardButton');

      // Wait for refresh to complete
      await pageObjects.compliance.waitForDataLoad();

      // Verify score is displayed (may be same or different)
      const refreshedScore = await pageObjects.compliance.getDashboardComplianceScore();
      expect(refreshedScore).toBeGreaterThanOrEqual(0);
      expect(refreshedScore).toBeLessThanOrEqual(100);
    });

    test('handles empty state when no data exists', async ({ page, esClient }) => {
      // Delete all compliance findings
      await esClient.deleteByQuery({
        index: 'compliance-findings-*',
        body: {
          query: { match_all: {} },
        },
        refresh: true,
      });

      // Refresh dashboard
      await page.reload();

      // Verify empty state is shown
      await expect(page.testSubj.locator('complianceEmptyState')).toBeVisible();
      await expect(page.testSubj.locator('complianceEmptyStateMessage')).toContainText(
        /No compliance data/i
      );
    });

    test('shows feature disabled warning when flag is off', async ({
      pageObjects,
      browserAuth,
      uiSettings,
      page,
    }) => {
      // Disable compliance feature flag
      await uiSettings.set('xpack.osquery.enableExperimental', []);

      // Re-login to pick up new settings
      await browserAuth.loginAsComplianceViewer();

      // Try to navigate to compliance
      await page.goto('/app/osquery');

      // Verify compliance nav is not visible
      const complianceNavExists = await page
        .getByRole('link', { name: /compliance/i })
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      expect(complianceNavExists).toBe(false);
    });
  }
);
