/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable playwright/no-nth-methods */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { socManagerRole } from '../common/roles';
import { loadSavedQuery, cleanupSavedQuery } from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

test.describe(
  'ALL - Live Query run custom and saved',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
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

      await test.step('Navigate and run initial query', async () => {
        await liveQuery.clickNewLiveQuery();
        await liveQuery.selectAllAgents();
        await liveQuery.clearAndInputQuery('select * from uptime;');

        await liveQuery.submitQuery();
        await liveQuery.checkResults();
      });

      await test.step('Verify result columns include days and hours', async () => {
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
      });

      await test.step('Add ECS mapping and re-run query', async () => {
        await liveQuery.clickAdvanced();
        await liveQuery.typeInECSFieldInput('message');
        await liveQuery.typeInOsqueryFieldInput('days');
        await liveQuery.submitQuery();

        await liveQuery.checkResults();
      });

      await test.step('Verify ECS-mapped columns', async () => {
        await expect(
          page.testSubj
            .locator('osqueryResultsTable')
            .locator('[data-test-subj="dataGridFullScreenButton"]')
        ).toBeVisible({ timeout: 30_000 });
        await expect(
          page.locator(
            '[data-gridcell-column-index="1"][data-test-subj="dataGridHeaderCell-message"]'
          )
        ).toBeVisible();
      });
    });

    test('should run customized saved query', async ({ page, pageObjects }) => {
      test.setTimeout(300_000); // Custom saved queries with timeout can be slow

      const liveQuery = pageObjects.liveQuery;

      await test.step('Navigate and select saved query', async () => {
        await liveQuery.clickNewLiveQuery();
        await liveQuery.selectAllAgents();

        const savedQueryDropdown = page.testSubj.locator('savedQuerySelect');
        const savedQueryInput = savedQueryDropdown.locator('[data-test-subj="comboBoxInput"]');
        await savedQueryInput.click();
        await savedQueryInput.pressSequentially(savedQueryName);
        const option = page.getByRole('option', { name: new RegExp(savedQueryName, 'i') }).first();
        await option.waitFor({ state: 'visible', timeout: 15_000 });
        await option.click();

        await page.testSubj.locator('kibanaCodeEditor').waitFor({ state: 'visible' });
        await expect(page.testSubj.locator('kibanaCodeEditor')).toContainText(
          'select * from uptime',
          {
            timeout: 15_000,
          }
        );
      });

      await test.step('Override query, set timeout and submit', async () => {
        await liveQuery.clearAndInputQuery('select * from users;');

        await liveQuery.clickAdvanced();
        await liveQuery.fillInQueryTimeout('601');

        await page.getByText('Submit').first().waitFor({ state: 'visible' });
        await liveQuery.submitQuery();
        await liveQuery.checkResults();
      });

      await test.step('Navigate back and verify query was saved with custom values', async () => {
        await page.gotoApp('osquery');
        await waitForPageReady(page);
        await page.locator('[aria-label="Run query"]').first().click();

        await expect(page.testSubj.locator('kibanaCodeEditor')).toContainText(
          'select * from users;'
        );
      });
    });

    test('should open query details by clicking the details icon', async ({ page }) => {
      await test.step('Navigate to Osquery and click details icon', async () => {
        await page.gotoApp('osquery');
        await waitForPageReady(page);
        await page.locator('[aria-label="Details"]').first().click();
      });

      await test.step('Verify live query details are visible', async () => {
        await expect(page.getByText('Live query details').first()).toBeVisible();
        await expect(page.getByText('select * from users;').first()).toBeVisible();
      });
    });
  }
);
