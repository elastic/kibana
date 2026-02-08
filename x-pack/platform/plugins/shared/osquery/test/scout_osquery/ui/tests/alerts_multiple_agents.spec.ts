/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security';
import { test } from '../fixtures';
import { socManagerRole } from '../../common/roles';
import { loadRule, cleanupRule } from '../../common/api_helpers';
import { waitForPageReady } from '../../common/constants';

test.describe('Alert Event Details - dynamic params', { tag: ['@ess', '@svlSecurity'] }, () => {
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

  test('should substitute parameters in investigation guide', async ({ page }) => {
    await page.testSubj.locator('expand-event').first().click();
    await page.testSubj
      .locator('securitySolutionFlyoutInvestigationGuideButton')
      .waitFor({ state: 'visible', timeout: 30_000 });
    await page.testSubj.locator('securitySolutionFlyoutInvestigationGuideButton').click();
    
    // Wait for investigation guide to load, then click the osquery action button
    const getProcessesButton = page.getByText('Get processes').first();
    await expect(getProcessesButton).toBeVisible({ timeout: 30_000 });

    // The "Get processes" button needs to be clicked to trigger the osquery action
    // Try clicking it first; if the flyout doesn't open, try double-clicking
    await getProcessesButton.click({ force: true });
    await page.waitForTimeout(2000);

    // Wait for the osquery flyout to open
    const flyoutBody = page.testSubj.locator('flyout-body-osquery');
    const isFlyoutVisible = await flyoutBody.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!isFlyoutVisible) {
      // Try double-click if single click didn't work
      await getProcessesButton.dblclick({ force: true });
    }
    await expect(flyoutBody).toBeVisible({ timeout: 30_000 });

    // Click the editor to ensure tokenization
    const editor = flyoutBody.locator('[data-test-subj="kibanaCodeEditor"]');
    await editor.waitFor({ state: 'visible', timeout: 15_000 });
    await editor.click();

    // Use toContainText on the code editor since getByText may not find text in Monaco/CodeMirror editors
    await expect(editor).toContainText('SELECT * FROM os_version', { timeout: 15_000 });
    await expect(flyoutBody.locator('input[value="host.os.platform"]')).toBeVisible();
  });

  // Skipped tests from Cypress
  test.skip('should substitute parameters in live query and increase number of ran queries', () => {
    // This test is skipped in Cypress as well
  });

  test.skip('should be able to run take action query against all enrolled agents', () => {
    // This test is skipped in Cypress as well
  });

  test.skip('should substitute params in osquery ran from timelines alerts', () => {
    // This test is skipped in Cypress as well
  });
});
