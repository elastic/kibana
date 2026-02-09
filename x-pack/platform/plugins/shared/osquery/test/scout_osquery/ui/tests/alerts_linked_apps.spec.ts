/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable playwright/no-nth-methods */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';
import { socManagerRole } from '../common/roles';
import { loadRule, cleanupRule } from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

test.describe('Alert Event Details', { tag: ['@ess', '@svlSecurity'] }, () => {
  let ruleId: string;
  let ruleName: string;

  test.beforeAll(async ({ kbnClient }) => {
    const rule = await loadRule(kbnClient, true); // true for response actions
    ruleId = rule.id;
    ruleName = rule.name;
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

  test('should be able to add investigation guides to response actions', async ({ page }) => {
    await page.testSubj.locator('editRuleSettingsLink').click();
    await waitForPageReady(page);
    await page.testSubj.locator('edit-rule-actions-tab').click();
    await expect(page.testSubj.locator('osquery-investigation-guide-text')).toBeVisible();
    await waitForPageReady(page);
    await expect(page.getByText('Loading connectors...').first()).not.toBeVisible();

    await page.testSubj.locator('osqueryAddInvestigationGuideQueries').click();
    // Wait for the investigation guide text to be replaced by response actions
    await expect(page.testSubj.locator('osquery-investigation-guide-text')).not.toBeVisible({
      timeout: 15_000,
    });

    // Wait for response actions to load after converting investigation guide
    const responseAction0 = page.testSubj.locator('response-actions-list-item-0');
    await expect(responseAction0).toBeVisible({ timeout: 30_000 });
    // Wait for the query text to render in the code editor
    // Use toContainText on the code editor since getByText may not find text in Monaco/CodeMirror editors
    await expect(responseAction0.locator('[data-test-subj="kibanaCodeEditor"]')).toContainText(
      'SELECT * FROM os_version',
      { timeout: 30_000 }
    );
    await expect(responseAction0.locator('input[value="host.os.platform"]')).toBeVisible({
      timeout: 15_000,
    });

    const responseAction1 = page.testSubj.locator('response-actions-list-item-1');
    await expect(responseAction1).toBeVisible({ timeout: 15_000 });
    await expect(responseAction1.locator('[data-test-subj="kibanaCodeEditor"]')).toContainText(
      'select * from users',
      { timeout: 15_000 }
    );

    await page.getByText('Save changes').first().click();
    await expect(page.getByText(`${ruleName} was saved`).first()).toBeVisible({ timeout: 30_000 });
  });

  test('should be able to run live query and add to timeline', async ({ page, kbnUrl }) => {
    test.setTimeout(180_000); // Alert tests can take time
    const TIMELINE_NAME = 'Untitled timeline';

    await page.testSubj.locator('expand-event').first().click();
    await page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton').click();
    await page.testSubj.locator('osquery-action-item').click();
    await expect(page.getByText(/^\d+ agent selected\./).first()).toBeVisible();

    // Select all agents
    const agentSelection = page.testSubj.locator('agentSelection');
    const agentInput = agentSelection.locator('[data-test-subj="comboBoxInput"]');
    await agentInput.click();
    const allAgentsOption = page.getByRole('option', { name: /All agents/ });
    await expect(allAgentsOption).toBeVisible({ timeout: 15_000 });
    await allAgentsOption.click();
    await expect(page.getByText(/\d+ agents? selected\./).first()).toBeVisible({ timeout: 10_000 });

    // Input query
    const queryEditor = page.testSubj
      .locator('flyout-body-osquery')
      .locator('[data-test-subj="kibanaCodeEditor"]');
    await queryEditor.click();
    await queryEditor.pressSequentially('select * from uptime;');

    // Submit query
    await page.waitForTimeout(1000); // Wait for validation
    await page.getByText('Submit').first().click();

    // Check results
    const resultsTable = page.testSubj.locator('osqueryResultsTable');
    await expect(resultsTable).toBeVisible({ timeout: 120_000 });
    const dataCell = page.testSubj.locator('dataGridRowCell').first();
    await expect(dataCell).toBeVisible({ timeout: 120_000 });

    await expect(page.getByText('Add to Timeline investigation').first()).toBeVisible({
      timeout: 30_000,
    });
    await page.testSubj.locator('add-to-timeline').first().click();
    await expect(page.testSubj.locator('globalToastList').getByText(/Added/)).toBeVisible();

    // Close the osquery flyout using keyboard (Escape) to avoid portal intercept issues
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2000);
    // If the overlay mask is still present, press Escape again
    const overlayMask = page.locator('.euiOverlayMask').first();
    if (await overlayMask.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // Also close the security solution flyout if it's still open
    const secFlyoutClose = page.testSubj.locator(
      'securitySolutionFlyoutNavigationCollapseDetailButton'
    );
    if (await secFlyoutClose.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await secFlyoutClose.click();
    }

    await page.waitForTimeout(1000);
    await page.testSubj
      .locator('timeline-bottom-bar')
      .getByText(TIMELINE_NAME)
      .click({ timeout: 15_000 });
    await expect(
      page.testSubj.locator('draggableWrapperKeyboardHandler').getByText(/action_id: "/)
    ).toBeVisible();

    // Navigate away to trigger unsaved changes modal if needed
    await page.goto(kbnUrl.get('/app/osquery'));
    await waitForPageReady(page);
  });
});
