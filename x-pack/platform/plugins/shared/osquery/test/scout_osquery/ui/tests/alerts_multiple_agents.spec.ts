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
import { waitForPageReady, waitForAlerts } from '../common/constants';

test.describe('Alert Event Details - dynamic params', { tag: ['@ess', '@svlSecurity'] }, () => {
  // Alert tests require waiting for rule execution + alert generation, which can be slow
  test.describe.configure({ timeout: 300_000 });

  let ruleId: string;

  test.beforeAll(async ({ kbnClient }) => {
    const rule = await loadRule(kbnClient, true); // true for response actions
    ruleId = rule.id;
  });

  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginWithCustomRole(socManagerRole);
    // Navigate to the rule and wait for alerts (reloads periodically until alerts appear)
    await page.goto(kbnUrl.get(`/app/security/rules/id/${ruleId}`));
    await waitForPageReady(page);
    await waitForAlerts(page);
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

  // response-actions-notification doesn't exist in expandable flyout
  test.skip('should substitute parameters in live query and increase number of ran queries', async ({
    page,
    pageObjects,
  }) => {
    await page.testSubj.locator('expand-event').first().click();
    const notificationBadge = page.testSubj.locator('response-actions-notification');
    await expect(notificationBadge).not.toHaveText('0');
    const initialNotificationCount = parseInt((await notificationBadge.textContent()) || '0', 10);

    // Take osquery action with params
    await page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton').click();
    await page.testSubj.locator('osquery-action-item').click();

    const flyoutBody = page.testSubj.locator('flyout-body-osquery');
    await expect(flyoutBody).toBeVisible({ timeout: 30_000 });

    await pageObjects.liveQuery.selectAllAgents();
    await pageObjects.liveQuery.inputQuery('select * from uptime;');
    await pageObjects.liveQuery.submitQuery();
    await pageObjects.liveQuery.checkResults();

    await page.testSubj.locator('osquery-empty-button').click();

    const updatedNotificationCount = parseInt((await notificationBadge.textContent()) || '0', 10);
    expect(initialNotificationCount).toBe(updatedNotificationCount - 1);

    // Verify response actions
    await page.testSubj
      .locator('securitySolutionDocumentDetailsFlyoutResponseSectionHeader')
      .click();
    await page.testSubj.locator('securitySolutionDocumentDetailsFlyoutResponseButton').click();

    const responseWrapper = page.testSubj.locator('responseActionsViewWrapper');
    await expect(responseWrapper.getByText('tags')).toBeVisible();
    await expect(responseWrapper.locator('[data-test-subj="osquery-results-comment"]')).toHaveCount(
      updatedNotificationCount
    );
  });

  test.skip('should be able to run take action query against all enrolled agents', async ({
    page,
    pageObjects,
  }) => {
    test.setTimeout(600_000);

    await page.testSubj.locator('expand-event').first().click();
    await page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton').click();
    await page.testSubj.locator('osquery-action-item').click();

    // Clear the pre-filled agent and select All agents
    const agentSelection = page.testSubj.locator('agentSelection');
    await agentSelection.locator('[data-test-subj="comboBoxClearButton"]').click();
    const agentInput = agentSelection.locator('[data-test-subj="comboBoxInput"]');
    await agentInput.pressSequentially('All');
    const allAgentsOption = page.getByRole('option', { name: /All agents/ });
    await allAgentsOption.waitFor({ state: 'visible', timeout: 15_000 });
    await allAgentsOption.click();

    await expect(agentSelection.getByText('All agents')).toBeVisible();

    await pageObjects.liveQuery.inputQuery(
      "SELECT * FROM os_version where name='{{host.os.name}}';"
    );
    await page.waitForTimeout(1000);
    await pageObjects.liveQuery.submitQuery();

    // At least 2 agents should respond
    const flyoutBody = page.testSubj.locator('flyout-body-osquery');
    // Wait for results to appear, then verify at least 2 agents responded
    await flyoutBody.locator('[data-grid-row-index]').first().waitFor({
      state: 'visible',
      timeout: 600_000,
    });
    const rowCount = await flyoutBody.locator('[data-grid-row-index]').count();
    expect(rowCount).toBeGreaterThanOrEqual(2);
  });

  test.skip('should substitute params in osquery ran from timelines alerts', async ({
    page,
    pageObjects,
  }) => {
    test.setTimeout(300_000);

    // Send alert to timeline
    await page.testSubj.locator('send-alert-to-timeline-button').first().click();

    // Expand first event in the timeline
    const queryEventsTable = page.testSubj.locator('query-events-table');
    await queryEventsTable.locator('[data-test-subj="expand-event"]').first().click();

    // Take osquery action with params
    await page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton').click();
    await page.testSubj.locator('osquery-action-item').click();

    const flyoutBody = page.testSubj.locator('flyout-body-osquery');
    await expect(flyoutBody).toBeVisible({ timeout: 30_000 });

    await pageObjects.liveQuery.selectAllAgents();
    await pageObjects.liveQuery.inputQuery('select * from uptime;');
    await pageObjects.liveQuery.submitQuery();
    await pageObjects.liveQuery.checkResults();
  });
});
