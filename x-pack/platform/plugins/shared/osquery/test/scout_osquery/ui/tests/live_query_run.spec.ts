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
import { loadSavedQuery, cleanupSavedQuery } from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

test.describe('ALL - Live Query run custom and saved', { tag: ['@ess', '@svlSecurity'] }, () => {
  let savedQueryId: string;
  let savedQueryName: string;

  test.beforeAll(async ({ kbnClient }) => {
    const savedQuery = await loadSavedQuery(kbnClient, {
      interval: '3600',
      query: 'select * from uptime;',
      ecs_mapping: {} as any,
    });
    savedQueryId = savedQuery.saved_object_id;
    savedQueryName = savedQuery.id;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(socManagerRole);
  });

  test.afterAll(async ({ kbnClient }) => {
    await cleanupSavedQuery(kbnClient, savedQueryId);
  });

  test('should run query and enable ecs mapping', async ({ page, pageObjects }) => {
    test.setTimeout(300_000); // ECS mapping queries can be slow

    const liveQuery = pageObjects.liveQuery;

    await liveQuery.clickNewLiveQuery();
    await liveQuery.selectAllAgents();
    await liveQuery.clearAndInputQuery('select * from uptime;');

    await liveQuery.submitQuery();
    await liveQuery.checkResults();

    // Verify result columns include days and hours
    await expect(
      page.locator(
        '[data-gridcell-column-index="1"][data-test-subj="dataGridHeaderCell-osquery.days.number"]'
      )
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.locator(
        '[data-gridcell-column-index="2"][data-test-subj="dataGridHeaderCell-osquery.hours.number"]'
      )
    ).toBeVisible();

    // Open advanced settings and add ECS mapping
    await liveQuery.clickAdvanced();
    await liveQuery.typeInECSFieldInput('message');
    await liveQuery.typeInOsqueryFieldInput('days');
    await liveQuery.submitQuery();

    await liveQuery.checkResults();

    // Verify ECS-mapped columns
    await expect(
      page.testSubj
        .locator('osqueryResultsTable')
        .locator('[data-test-subj="dataGridFullScreenButton"]')
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.locator('[data-gridcell-column-index="1"][data-test-subj="dataGridHeaderCell-message"]')
    ).toBeVisible();
  });

  test('should run customized saved query', async ({ page, pageObjects }) => {
    test.setTimeout(300_000); // Custom saved queries with timeout can be slow

    const liveQuery = pageObjects.liveQuery;

    await liveQuery.clickNewLiveQuery();
    await liveQuery.selectAllAgents();

    // Select saved query from dropdown
    const savedQueryDropdown = page.testSubj.locator('savedQuerySelect');
    const savedQueryInput = savedQueryDropdown.locator('[data-test-subj="comboBoxInput"]');
    await savedQueryInput.click();
    await savedQueryInput.pressSequentially(savedQueryName);
    const option = page.getByRole('option', { name: new RegExp(savedQueryName, 'i') }).first();
    await option.waitFor({ state: 'visible', timeout: 15_000 });
    await option.click();

    // Wait for the saved query's content to be loaded into the editor
    await page.waitForTimeout(2000);
    await expect(page.testSubj.locator('kibanaCodeEditor')).toContainText('select * from uptime', {
      timeout: 15_000,
    });

    // Override the query
    await liveQuery.clearAndInputQuery('select * from users;');

    // Set a custom timeout
    await liveQuery.clickAdvanced();
    await liveQuery.fillInQueryTimeout('601');

    await page.waitForTimeout(1000);
    await liveQuery.submitQuery();
    await liveQuery.checkResults();

    // Navigate back and replay the query
    await page.gotoApp('osquery');
    await waitForPageReady(page);
    await page.locator('[aria-label="Run query"]').first().click();

    // Verify the query was saved with the custom values
    await expect(page.testSubj.locator('kibanaCodeEditor')).toContainText('select * from users;');
  });

  test('should open query details by clicking the details icon', async ({ page }) => {
    // Click the details icon for the first query in the list
    await page.gotoApp('osquery');
    await waitForPageReady(page);
    await page.locator('[aria-label="Details"]').first().click();

    await expect(page.getByText('Live query details').first()).toBeVisible();
    await expect(page.getByText('select * from users;').first()).toBeVisible();
  });
});
