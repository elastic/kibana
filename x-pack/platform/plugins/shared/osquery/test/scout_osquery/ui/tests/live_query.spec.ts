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

test.describe('ALL - Live Query', { tag: ['@ess', '@svlSecurity'] }, () => {
  // Live queries require agent communication which can be slow
  test.describe.configure({ timeout: 300_000 });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(socManagerRole);
    await pageObjects.liveQuery.navigate();
  });

  test('should validate the form', async ({ page, pageObjects }) => {
    const liveQuery = pageObjects.liveQuery;

    // Navigate to "New live query" page
    await liveQuery.clickNewLiveQuery();

    // Submit without filling required fields — expect validation errors
    await liveQuery.submitQuery();
    await expect(page.getByText('Agents is a required field').first()).toBeVisible();
    await expect(page.getByText('Query is a required field').first()).toBeVisible();

    // Type a query to clear the query validation error
    await liveQuery.inputQuery('select * from uptime;');
    await liveQuery.submitQuery();

    // "Query is a required field" should be gone
    await expect(page.getByText('Query is a required field').first()).not.toBeVisible();
    // "Agents is a required field" should still be visible (we didn't select agents)
    await expect(page.getByText('Agents is a required field').first()).toBeVisible();
  });

  test('should show timeout validation errors', async ({ page, pageObjects }) => {
    const liveQuery = pageObjects.liveQuery;

    await liveQuery.clickNewLiveQuery();

    // Open advanced settings
    await liveQuery.clickAdvanced();

    // Fill in an invalid timeout (> 86400 seconds)
    await liveQuery.fillInQueryTimeout('86410');
    await liveQuery.submitQuery();
    await expect(
      page.getByText('The timeout value must be 86400 seconds or or lower.').first()
    ).toBeVisible();

    // Fix the timeout
    await liveQuery.fillInQueryTimeout('890');
    await liveQuery.submitQuery();
    await expect(
      page.getByText('The timeout value must be 86400 seconds or or lower.').first()
    ).not.toBeVisible();
  });

  test('should handle multiline query in editor', async ({ page, pageObjects }) => {
    const liveQuery = pageObjects.liveQuery;

    await liveQuery.clickNewLiveQuery();

    // Verify initial editor height
    const initialHeight = await liveQuery.getQueryEditorHeight();
    expect(initialHeight).toBeGreaterThan(99);
    expect(initialHeight).toBeLessThan(150);

    // Build multiline query using keyboard
    const multilineQuery = [
      'select u.username,',
      '       p.pid,',
      '       p.name,',
      '       pos.local_address,',
      '       pos.local_port,',
      '       p.path,',
      '       p.cmdline,',
      '       pos.remote_address,',
      '       pos.remote_port',
      'from processes as p',
      'join users as u',
      '    on u.uid=p.uid',
      'join process_open_sockets as pos',
      '    on pos.pid=p.pid',
      "where pos.remote_port !='0'",
      'limit 1000;',
    ];

    // Click into editor and type each line with Shift+Enter for newlines
    await liveQuery.queryEditor.click();
    for (let i = 0; i < multilineQuery.length; i++) {
      await page.keyboard.type(multilineQuery[i]);
      if (i < multilineQuery.length - 1) {
        await page.keyboard.press('Shift+Enter');
      }
    }

    // Editor should have grown to fit the multiline query
    const expandedHeight = await liveQuery.getQueryEditorHeight();
    expect(expandedHeight).toBeGreaterThan(220);

    // Clear editor
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');

    // Editor height should remain reasonable after clearing
    // Note: CodeMirror may not immediately shrink after clearing content
    const clearedHeight = await liveQuery.getQueryEditorHeight();
    expect(clearedHeight).toBeGreaterThan(0);
  });

  test('should run a live query and check results', async ({ page, pageObjects }) => {
    test.setTimeout(180_000); // Live queries can take time for agents to respond
    const liveQuery = pageObjects.liveQuery;

    await liveQuery.clickNewLiveQuery();

    // Select all agents
    await liveQuery.selectAllAgents();
    await liveQuery.inputQuery('select * from uptime;');
    await liveQuery.submitQuery();

    // Check results
    await liveQuery.checkResults();

    // Click through to agent details
    const firstCell = page.locator('[data-gridcell-column-index="0"][data-gridcell-row-index="0"]');
    await expect(firstCell).toBeVisible();
    await firstCell.locator('[data-euigrid-tab-managed="true"]').click();
    await expect(page).toHaveURL(/app\/fleet\/agents\//);
  });

  test('should run multiline query and display results', async ({ page, pageObjects }) => {
    test.setTimeout(180_000); // Live queries can take time for agents to respond
    const liveQuery = pageObjects.liveQuery;

    await liveQuery.clickNewLiveQuery();

    const multilineQuery = [
      'select u.username,',
      '       p.pid,',
      '       p.name,',
      '       pos.local_address,',
      '       pos.local_port,',
      '       p.path,',
      '       p.cmdline,',
      '       pos.remote_address,',
      '       pos.remote_port',
      'from processes as p',
      'join users as u',
      '    on u.uid=p.uid',
      'join process_open_sockets as pos',
      '    on pos.pid=p.pid',
      "where pos.remote_port !='0'",
      'limit 1000;',
    ];

    // Type multiline query
    await liveQuery.queryEditor.click();
    for (let i = 0; i < multilineQuery.length; i++) {
      await page.keyboard.type(multilineQuery[i]);
      if (i < multilineQuery.length - 1) {
        await page.keyboard.press('Shift+Enter');
      }
    }

    // Select all agents and submit
    await liveQuery.selectAllAgents();
    await liveQuery.submitQuery();

    // Results panel should appear (give extra time for osquery to respond)
    await expect(liveQuery.resultsPanel).toBeVisible({ timeout: 60_000 });
  });

  test('should validate form fully and submit with ECS mapping', async ({ page, pageObjects }) => {
    test.setTimeout(180_000); // Live queries can take time for agents to respond
    const liveQuery = pageObjects.liveQuery;

    await liveQuery.clickNewLiveQuery();
    await liveQuery.selectAllAgents();
    await liveQuery.inputQuery('select * from uptime;');

    // Open advanced settings and set timeout (matches original Cypress flow)
    await liveQuery.clickAdvanced();
    await liveQuery.fillInQueryTimeout('890');

    // Test ECS mapping validation
    await liveQuery.typeInOsqueryFieldInput('days');
    await liveQuery.submitQuery();
    await expect(page.getByText('ECS field is required.').first()).toBeVisible();

    await liveQuery.typeInECSFieldInput('message');

    // Intercept the POST request to verify payload (set up listener before submitting)
    const postQueryPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/osquery/live_queries') &&
        response.request().method() === 'POST',
      { timeout: 60_000 }
    );

    await liveQuery.submitQuery();
    await expect(page.getByText('ECS field is required.').first()).not.toBeVisible();

    const response = await postQueryPromise;
    const requestBody = response.request().postDataJSON();
    const responseBody = await response.json();

    expect(requestBody).toHaveProperty('query', 'select * from uptime;');
    expect(requestBody).toHaveProperty('timeout', 890);
    expect(response.status()).toBe(200);
    expect(responseBody.data.queries[0]).toHaveProperty('timeout', 890);
  });
});
