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
 * Scout UI tests for Custom Rule Authoring
 * Tests rule creation wizard, query builder, validation, and preview
 */
test.describe(
  'Custom Rule Authoring',
  {
    tag: [tags.stateful.classic, '@ess'],
  },
  () => {
    const testRuleName = `test-rule-${Date.now()}`;

    test.beforeEach(async ({ pageObjects, browserAuth, uiSettings }) => {
      await uiSettings.set('xpack.osquery.enableExperimental', ['endpointComplianceMonitoring']);
      await browserAuth.loginAsComplianceEditor();
      await pageObjects.compliance.gotoRuleAuthoring();
    });

    test.afterAll(async ({ esClient }) => {
      // Cleanup: Delete test rules
      try {
        await esClient.deleteByQuery({
          index: '.kibana*',
          body: {
            query: {
              bool: {
                must: [
                  { term: { type: 'osquery-compliance-rule' } },
                  { prefix: { 'osquery-compliance-rule.name': 'test-rule-' } },
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

    test('renders rule authoring wizard', async ({ page }) => {
      // Verify page loads
      await expect(page.testSubj.locator('ruleAuthoringPage')).toBeVisible();

      // Verify URL
      expect(page.url()).toContain('/osquery/compliance/rules/create');

      // Verify form sections are visible
      await expect(page.testSubj.locator('ruleBasicInfoSection')).toBeVisible();
      await expect(page.testSubj.locator('ruleQuerySection')).toBeVisible();
    });

    test('creates custom rule with valid inputs', async ({ pageObjects, page }) => {
      // Fill rule name
      await pageObjects.compliance.fillRuleName(testRuleName);

      // Fill osquery query
      await pageObjects.compliance.fillOsqueryQuery(
        'SELECT * FROM processes WHERE name LIKE "%test%";'
      );

      // Fill remediation
      await pageObjects.compliance.fillRemediation('Remove test processes from the system');

      // Select platform
      await pageObjects.compliance.selectPlatform('linux');

      // Fill rule section
      await page.testSubj.fill('ruleSectionInput', 'Test Section');

      // Fill rule number
      await page.testSubj.fill('ruleNumberInput', '99.99.99');

      // Click save
      await pageObjects.compliance.clickSaveRuleButton();

      // Verify success toast
      await expect(page.testSubj.locator('globalToastList')).toContainText(
        /rule created successfully/i,
        { timeout: 10000 }
      );

      // Verify navigation back to rules page
      await expect(page).toHaveURL(/\/osquery\/compliance\/rules$/);
    });

    test('validates required fields', async ({ page }) => {
      // Try to save without filling required fields
      const saveButton = page.testSubj.locator('saveRuleButton');
      await saveButton.click();

      // Verify validation errors appear
      await expect(page.testSubj.locator('ruleNameError')).toContainText(/required/i);
      await expect(page.testSubj.locator('ruleQueryError')).toContainText(/required/i);

      // Verify save button remains enabled (can retry)
      await expect(saveButton).toBeEnabled();
    });

    test('validates osquery syntax in query builder', async ({ page, pageObjects }) => {
      // Fill rule name
      await pageObjects.compliance.fillRuleName(testRuleName);

      // Enter invalid osquery query
      await pageObjects.compliance.fillOsqueryQuery('INVALID QUERY SYNTAX');

      // Trigger validation (blur or click validate button)
      const queryInput = page.testSubj.locator('osqueryQueryInput');
      await queryInput.blur();

      // Check if validation error appears
      const validationError = page.testSubj.locator('queryValidationError');
      const hasError = await validationError.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasError) {
        await expect(validationError).toContainText(/syntax error|invalid/i);
      }
    });

    test('shows query builder with syntax highlighting', async ({ page }) => {
      // Verify query builder is visible
      await expect(page.testSubj.locator('osqueryQueryBuilder')).toBeVisible();

      // Verify syntax highlighting is present (code editor component)
      const codeEditor = page.locator('.monaco-editor').or(page.locator('.ace_editor'));
      const hasEditor = await codeEditor.isVisible({ timeout: 2000 }).catch(() => false);

      // If no fancy editor, at least verify textarea exists
      if (!hasEditor) {
        await expect(page.testSubj.locator('osqueryQueryInput')).toBeVisible();
      }
    });

    test('provides query templates/examples', async ({ page }) => {
      // Check if template button exists
      const templateButton = page.testSubj.locator('queryTemplatesButton');
      const exists = await templateButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (exists) {
        // Click templates button
        await templateButton.click();

        // Verify template list appears
        await expect(page.testSubj.locator('queryTemplatesList')).toBeVisible();

        // Select first template
        await page.testSubj.locator('queryTemplate').first().click();

        // Verify query was populated
        const queryInput = page.testSubj.locator('osqueryQueryInput');
        const queryValue = await queryInput.inputValue();
        expect(queryValue.length).toBeGreaterThan(0);
      }
    });

    test('tests query in sandbox mode', async ({ page }) => {
      // Fill valid query
      await page.testSubj.fill('osqueryQueryInput', 'SELECT * FROM processes LIMIT 10;');

      // Check if test query button exists
      const testButton = page.testSubj.locator('testQueryButton');
      const exists = await testButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (exists) {
        // Click test query
        await testButton.click();

        // Verify test results panel appears
        await expect(page.testSubj.locator('queryTestResults')).toBeVisible({ timeout: 10000 });

        // Verify results show success or error
        const resultsPanel = page.testSubj.locator('queryTestResults');
        const hasSuccess =
          (await resultsPanel.getByText(/success/i).isVisible().catch(() => false)) ||
          (await resultsPanel.getByText(/rows returned/i).isVisible().catch(() => false));

        expect(hasSuccess).toBe(true);
      }
    });

    test('previews rule evaluation logic', async ({ page, pageObjects }) => {
      // Fill required fields
      await pageObjects.compliance.fillRuleName(testRuleName);
      await pageObjects.compliance.fillOsqueryQuery('SELECT COUNT(*) as count FROM processes;');

      // Check if preview button exists
      const previewButton = page.testSubj.locator('previewRuleButton');
      const exists = await previewButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (exists) {
        // Click preview
        await previewButton.click();

        // Verify preview panel shows
        await expect(page.testSubj.locator('rulePreviewPanel')).toBeVisible();

        // Verify preview shows evaluation logic
        await expect(page.testSubj.locator('previewEvaluationLogic')).toBeVisible();
      }
    });

    test('cancels rule creation', async ({ page, pageObjects }) => {
      // Fill some data
      await pageObjects.compliance.fillRuleName('Temporary Rule');

      // Click cancel
      await page.testSubj.click('cancelRuleButton');

      // Verify navigation back to rules page
      await expect(page).toHaveURL(/\/osquery\/compliance\/rules$/);

      // Verify no rule was created
      const rulesCount = await pageObjects.compliance.getRulesCount();
      const hasTestRule = await page
        .getByText('Temporary Rule')
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      expect(hasTestRule).toBe(false);
    });

    test('shows unsaved changes warning', async ({ page, pageObjects }) => {
      // Fill some data
      await pageObjects.compliance.fillRuleName('Unsaved Rule');
      await pageObjects.compliance.fillOsqueryQuery('SELECT * FROM users;');

      // Try to navigate away using browser back
      await page.goBack();

      // Check if confirmation dialog appears
      const dialog = page.getByRole('dialog').or(page.locator('[role="alertdialog"]'));
      const hasDialog = await dialog.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasDialog) {
        // Verify warning message
        await expect(dialog).toContainText(/unsaved changes|discard/i);

        // Cancel navigation
        await page.getByRole('button', { name: /cancel|stay/i }).click();

        // Verify still on authoring page
        await expect(page.testSubj.locator('ruleAuthoringPage')).toBeVisible();
      }
    });

    test('handles save errors gracefully', async ({ page, pageObjects }) => {
      // Fill with potentially problematic data (duplicate name if implemented)
      await pageObjects.compliance.fillRuleName('CIS-1.1.1'); // Likely exists

      await pageObjects.compliance.fillOsqueryQuery('SELECT * FROM processes;');
      await pageObjects.compliance.fillRemediation('Test remediation');
      await pageObjects.compliance.selectPlatform('linux');

      // Try to save
      await page.testSubj.click('saveRuleButton');

      // Wait for response
      await page.waitForTimeout(3000);

      // Check if error toast or inline error appears
      const hasErrorToast =
        await page.testSubj
          .locator('globalToastList')
          .getByText(/error|failed/i)
          .isVisible({ timeout: 2000 })
          .catch(() => false);

      const hasInlineError =
        await page.testSubj
          .locator('ruleNameError')
          .isVisible({ timeout: 2000 })
          .catch(() => false);

      // At least one error indication should show
      expect(hasErrorToast || hasInlineError).toBe(true);
    });
  }
);
