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
import { waitForPageReady } from '../common/constants';

// FLAKY: https://github.com/elastic/kibana/issues/229432
test.describe.skip('ALL - Timelines', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(socManagerRole);
  });

  test('should substitute osquery parameter on non-alert event take action', async ({
    page,
    kbnUrl,
    pageObjects,
  }) => {
    test.setTimeout(300_000);

    await page.goto(kbnUrl.get('/app/security/timelines'));
    await waitForPageReady(page);

    // Open the timeline bar
    await page.testSubj.locator('timeline-bottom-bar').waitFor({ state: 'visible' });
    await page.testSubj.locator('timeline-bottom-bar-title-button').click();

    // Type the query in the timeline search input
    const queryInput = page.testSubj.locator('timelineQueryInput');
    await queryInput.waitFor({ state: 'visible', timeout: 30_000 });
    await queryInput.fill(
      'NOT host.name: "dev-fleet-server*" and component.type: "osquery" AND (_index: "logs-*" OR _index: "filebeat-*")'
    );
    await page.keyboard.press('Enter');

    // Wait for results and expand the first event
    await page.testSubj
      .locator('docTableExpandToggleColumn')
      .first()
      .waitFor({ state: 'visible', timeout: 120_000 });
    await page.testSubj.locator('docTableExpandToggleColumn').first().click({ force: true });

    // Take Osquery action with params
    await page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton').click();
    await page.testSubj.locator('osquery-action-item').click();

    // Verify the osquery flyout opened
    const flyoutBody = page.testSubj.locator('flyout-body-osquery');
    await expect(flyoutBody).toBeVisible({ timeout: 30_000 });

    // Select all agents
    await pageObjects.liveQuery.selectAllAgents();

    // Input and submit a query
    await pageObjects.liveQuery.inputQuery('select * from uptime;');
    await pageObjects.liveQuery.submitQuery();

    // Verify results appear
    await pageObjects.liveQuery.checkResults();
  });
});
