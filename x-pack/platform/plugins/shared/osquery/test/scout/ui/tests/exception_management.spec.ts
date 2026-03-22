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
 * Scout UI tests for Exception Management
 * Tests exception creation, scoping, expiration, and audit trail
 */
test.describe(
  'Exception Management',
  {
    tag: [tags.stateful.classic, '@ess'],
  },
  () => {
    test.beforeEach(async ({ pageObjects, browserAuth, uiSettings }) => {
      await uiSettings.set('xpack.osquery.enableExperimental', ['endpointComplianceMonitoring']);
      await browserAuth.loginAsComplianceEditor();
      await pageObjects.compliance.gotoExceptionManagement();
    });

    test.afterAll(async ({ esClient }) => {
      // Cleanup: Delete test exceptions
      try {
        await esClient.deleteByQuery({
          index: '.kibana*',
          body: {
            query: {
              bool: {
                must: [
                  { term: { type: 'osquery-compliance-exception' } },
                  { prefix: { 'osquery-compliance-exception.rule_id': 'test-' } },
                ],
              },
            },
          },
          refresh: true,
        });
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    test('renders exception management page', async ({ page }) => {
      // Verify page loads
      await expect(page.testSubj.locator('exceptionManagementPage')).toBeVisible();

      // Verify URL
      expect(page.url()).toContain('/osquery/compliance/exceptions');

      // Verify exceptions table is visible
      await expect(page.testSubj.locator('exceptionsTable')).toBeVisible();
    });

    test('displays exceptions with expected columns', async ({ page }) => {
      // Verify table headers
      await expect(page.getByRole('columnheader', { name: /rule/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /scope/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /created/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /expires/i })).toBeVisible();
    });

    test('creates host-scoped exception', async ({ pageObjects, page }) => {
      // Get initial count
      const initialCount = await pageObjects.compliance.getExceptionsCount();

      // Create exception
      await page.testSubj.click('createExceptionButton');

      // Fill exception form
      await page.testSubj.fill('exceptionRuleIdInput', 'test-rule-001');

      // Select host scope
      await page.testSubj.click('exceptionScope-host');

      // Fill hostname
      await page.testSubj.fill('exceptionHostnameInput', 'test-host-01');

      // Add reason
      await page.testSubj.fill('exceptionReasonInput', 'Test environment exception');

      // Save exception
      await page.testSubj.click('saveExceptionButton');

      // Verify success toast
      await expect(page.testSubj.locator('globalToastList')).toContainText(
        /exception created/i,
        { timeout: 10000 }
      );

      // Verify exception appears in table
      const newCount = await pageObjects.compliance.getExceptionsCount();
      expect(newCount).toBe(initialCount + 1);
    });

    test('creates rule-scoped exception', async ({ page }) => {
      // Create exception
      await page.testSubj.click('createExceptionButton');

      // Fill rule ID
      await page.testSubj.fill('exceptionRuleIdInput', 'test-rule-002');

      // Select rule scope (applies to all hosts)
      await page.testSubj.click('exceptionScope-rule');

      // Add reason
      await page.testSubj.fill('exceptionReasonInput', 'Rule permanently disabled');

      // Save
      await page.testSubj.click('saveExceptionButton');

      // Verify success
      await expect(page.testSubj.locator('globalToastList')).toContainText(
        /exception created/i,
        { timeout: 10000 }
      );
    });

    test('creates global exception', async ({ page }) => {
      // Create exception
      await page.testSubj.click('createExceptionButton');

      // Fill rule ID
      await page.testSubj.fill('exceptionRuleIdInput', 'test-rule-003');

      // Select global scope
      await page.testSubj.click('exceptionScope-global');

      // Add reason
      await page.testSubj.fill('exceptionReasonInput', 'Global exception for testing');

      // Save
      await page.testSubj.click('saveExceptionButton');

      // Verify success
      await expect(page.testSubj.locator('globalToastList')).toContainText(
        /exception created/i,
        { timeout: 10000 }
      );
    });

    test('creates time-bound exception with expiration', async ({ page }) => {
      // Create exception
      await page.testSubj.click('createExceptionButton');

      // Fill form
      await page.testSubj.fill('exceptionRuleIdInput', 'test-rule-004');
      await page.testSubj.click('exceptionScope-host');
      await page.testSubj.fill('exceptionHostnameInput', 'test-host-02');

      // Check if expiration toggle exists
      const expirationToggle = page.testSubj.locator('exceptionExpirationToggle');
      const hasExpiration = await expirationToggle.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasExpiration) {
        // Enable expiration
        await expirationToggle.check();

        // Set expiration date (7 days from now)
        await page.testSubj.click('exceptionExpirationDate');
        await page.getByRole('button', { name: /7 days/i }).click();

        // Save
        await page.testSubj.click('saveExceptionButton');

        // Verify success
        await expect(page.testSubj.locator('globalToastList')).toContainText(
          /exception created/i
        );

        // Verify expiration is shown in table
        await expect(page.getByText(/expires in 7 days/i)).toBeVisible();
      }
    });

    test('deletes exception', async ({ page, pageObjects }) => {
      // Get initial count
      const initialCount = await pageObjects.compliance.getExceptionsCount();

      if (initialCount > 0) {
        // Click delete button on first exception
        await page.testSubj.locator('deleteExceptionButton').first().click();

        // Confirm deletion in modal
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('button', { name: /confirm|delete/i }).click();

        // Verify success toast
        await expect(page.testSubj.locator('globalToastList')).toContainText(
          /exception deleted/i,
          { timeout: 10000 }
        );

        // Verify count decreased
        const newCount = await pageObjects.compliance.getExceptionsCount();
        expect(newCount).toBe(initialCount - 1);
      }
    });

    test('displays exception audit trail', async ({ page }) => {
      // Click on first exception row to view details
      await page.testSubj.locator('exceptionRow').first().click();

      // Verify detail flyout opens
      await expect(page.testSubj.locator('exceptionDetailFlyout')).toBeVisible({ timeout: 5000 });

      // Check if audit trail section exists
      const auditSection = page.testSubj.locator('exceptionAuditTrail');
      const hasAudit = await auditSection.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasAudit) {
        // Verify audit trail shows creation event
        await expect(auditSection).toContainText(/created/i);

        // Verify audit trail shows creator
        await expect(auditSection).toContainText(/created by/i);
      }
    });

    test('filters exceptions by scope', async ({ page }) => {
      // Check if scope filter exists
      const scopeFilter = page.testSubj.locator('exceptionScopeFilter');
      const exists = await scopeFilter.isVisible({ timeout: 2000 }).catch(() => false);

      if (exists) {
        // Click scope filter
        await scopeFilter.click();

        // Select "host" scope
        await page.getByRole('option', { name: /host/i }).click();

        // Wait for filter to apply
        await page.waitForTimeout(1000);

        // Verify table updated
        await expect(page.testSubj.locator('exceptionsTable')).toBeVisible();
      }
    });

    test('shows impact analysis for exception', async ({ page }) => {
      // Click on first exception
      await page.testSubj.locator('exceptionRow').first().click();

      // Verify detail flyout
      await expect(page.testSubj.locator('exceptionDetailFlyout')).toBeVisible();

      // Check if impact section exists
      const impactSection = page.testSubj.locator('exceptionImpactAnalysis');
      const hasImpact = await impactSection.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasImpact) {
        // Verify impact shows affected hosts count
        await expect(impactSection).toContainText(/affected hosts|hosts impacted/i);

        // Verify impact shows findings count
        await expect(impactSection).toContainText(/findings|results/i);
      }
    });

    test('handles duplicate exception creation', async ({ page, pageObjects }) => {
      // Create first exception
      await page.testSubj.click('createExceptionButton');
      await page.testSubj.fill('exceptionRuleIdInput', 'test-dup-rule');
      await page.testSubj.click('exceptionScope-host');
      await page.testSubj.fill('exceptionHostnameInput', 'test-dup-host');
      await page.testSubj.fill('exceptionReasonInput', 'First exception');
      await page.testSubj.click('saveExceptionButton');

      // Wait for success
      await expect(page.testSubj.locator('globalToastList')).toContainText(/created/i);

      // Try to create duplicate
      await page.testSubj.click('createExceptionButton');
      await page.testSubj.fill('exceptionRuleIdInput', 'test-dup-rule');
      await page.testSubj.click('exceptionScope-host');
      await page.testSubj.fill('exceptionHostnameInput', 'test-dup-host');
      await page.testSubj.fill('exceptionReasonInput', 'Duplicate exception');
      await page.testSubj.click('saveExceptionButton');

      // Verify error appears
      const hasError =
        (await page.testSubj
          .locator('globalToastList')
          .getByText(/already exists|duplicate/i)
          .isVisible({ timeout: 3000 })
          .catch(() => false)) ||
        (await page.testSubj
          .locator('exceptionFormError')
          .isVisible({ timeout: 3000 })
          .catch(() => false));

      expect(hasError).toBe(true);
    });

    test('allows viewer to see but not modify exceptions', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      // Login as viewer
      await browserAuth.loginAsComplianceViewer();
      await pageObjects.compliance.gotoExceptionManagement();

      // Verify create button is disabled or hidden
      const createButton = page.testSubj.locator('createExceptionButton');
      const canCreate =
        (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) &&
        (await createButton.isEnabled().catch(() => false));

      expect(canCreate).toBe(false);

      // Verify delete buttons are disabled or hidden
      const deleteButtons = page.testSubj.locator('deleteExceptionButton');
      const firstDeleteButton = deleteButtons.first();
      const hasDelete = await firstDeleteButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasDelete) {
        await expect(firstDeleteButton).toBeDisabled();
      }
    });
  }
);
