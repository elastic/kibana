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

test.describe(
  'ALL - Live Query',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(socManagerRole);
      await pageObjects.liveQuery.navigate();
    });

    test('should validate the form', async ({ page, pageObjects }) => {
      const liveQuery = pageObjects.liveQuery;

      await test.step('Navigate to New live query page', async () => {
        await liveQuery.clickNewLiveQuery();
      });

      await test.step('Submit without required fields and verify validation errors', async () => {
        await liveQuery.submitQuery();
        await expect(page.getByText('Agents is a required field').first()).toBeVisible();
        await expect(page.getByText('Query is a required field').first()).toBeVisible();
      });

      await test.step('Type query and verify agents validation remains', async () => {
        await liveQuery.inputQuery('select * from uptime;');
        await liveQuery.submitQuery();

        await expect(page.getByText('Query is a required field').first()).not.toBeVisible();
        await expect(page.getByText('Agents is a required field').first()).toBeVisible();
      });
    });

    test('should show timeout validation errors', async ({ page, pageObjects }) => {
      const liveQuery = pageObjects.liveQuery;

      await test.step('Navigate to New live query and open advanced settings', async () => {
        await liveQuery.clickNewLiveQuery();
        await liveQuery.clickAdvanced();
      });

      await test.step('Submit with invalid timeout and verify error', async () => {
        await liveQuery.fillInQueryTimeout('86410');
        await liveQuery.submitQuery();
        await expect(
          page.getByText('The timeout value must be 86400 seconds or or lower.').first()
        ).toBeVisible();
      });

      await test.step('Fix timeout and verify error is cleared', async () => {
        await liveQuery.fillInQueryTimeout('890');
        await liveQuery.submitQuery();
        await expect(
          page.getByText('The timeout value must be 86400 seconds or or lower.').first()
        ).not.toBeVisible();
      });
    });

    test('should handle multiline query in editor', async ({ page, pageObjects }) => {
      const liveQuery = pageObjects.liveQuery;

      await test.step('Navigate and verify initial editor height', async () => {
        await liveQuery.clickNewLiveQuery();

        const initialHeight = await liveQuery.getQueryEditorHeight();
        expect(initialHeight).toBeGreaterThan(99);
        expect(initialHeight).toBeLessThan(150);
      });

      await test.step('Build multiline query in editor', async () => {
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

        await liveQuery.queryEditor.click();
        for (let i = 0; i < multilineQuery.length; i++) {
          await page.keyboard.type(multilineQuery[i]);
          if (i < multilineQuery.length - 1) {
            await page.keyboard.press('Shift+Enter');
          }
        }

        const expandedHeight = await liveQuery.getQueryEditorHeight();
        expect(expandedHeight).toBeGreaterThan(220);
      });

      await test.step('Clear editor and verify height', async () => {
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Backspace');
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Backspace');

        const clearedHeight = await liveQuery.getQueryEditorHeight();
        expect(clearedHeight).toBeGreaterThan(0);
      });
    });

    test('should run a live query and check results', async ({ page, pageObjects }) => {
      test.setTimeout(180_000); // Live queries can take time for agents to respond
      const liveQuery = pageObjects.liveQuery;

      await test.step('Navigate and configure live query', async () => {
        await liveQuery.clickNewLiveQuery();
        await liveQuery.selectAllAgents();
        await liveQuery.inputQuery('select * from uptime;');
        await liveQuery.submitQuery();
      });

      await test.step('Check results and click through to agent details', async () => {
        await liveQuery.checkResults();

        const firstCell = page.locator(
          '[data-gridcell-column-index="0"][data-gridcell-row-index="0"]'
        );
        await expect(firstCell).toBeVisible();
        await firstCell.locator('[data-euigrid-tab-managed="true"]').click();
        await expect(page).toHaveURL(/app\/fleet\/agents\//);
      });
    });

    test('should run multiline query and display results', async ({ page, pageObjects }) => {
      test.setTimeout(180_000); // Live queries can take time for agents to respond
      const liveQuery = pageObjects.liveQuery;

      await test.step('Navigate and type multiline query', async () => {
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

        await liveQuery.queryEditor.click();
        for (let i = 0; i < multilineQuery.length; i++) {
          await page.keyboard.type(multilineQuery[i]);
          if (i < multilineQuery.length - 1) {
            await page.keyboard.press('Shift+Enter');
          }
        }
      });

      await test.step('Select agents, submit and verify results', async () => {
        await liveQuery.selectAllAgents();
        await liveQuery.submitQuery();

        await expect(liveQuery.resultsPanel).toBeVisible({ timeout: 60_000 });
      });
    });

    test('should validate form fully and submit with ECS mapping', async ({
      page,
      pageObjects,
    }) => {
      test.setTimeout(180_000); // Live queries can take time for agents to respond
      const liveQuery = pageObjects.liveQuery;

      await test.step('Navigate and configure query with advanced settings', async () => {
        await liveQuery.clickNewLiveQuery();
        await liveQuery.selectAllAgents();
        await liveQuery.inputQuery('select * from uptime;');

        await liveQuery.clickAdvanced();
        await liveQuery.fillInQueryTimeout('890');
      });

      await test.step('Test ECS mapping validation and fix', async () => {
        await liveQuery.typeInOsqueryFieldInput('days');
        await liveQuery.submitQuery();
        await expect(page.getByText('ECS field is required.').first()).toBeVisible();

        await liveQuery.typeInECSFieldInput('message');
      });

      await test.step('Submit and verify payload', async () => {
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
  }
);
