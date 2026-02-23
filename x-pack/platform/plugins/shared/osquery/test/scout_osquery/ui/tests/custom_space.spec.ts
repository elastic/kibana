/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { socManagerRole } from '../common/roles';
import {
  loadPack,
  cleanupPack,
  loadSpace,
  cleanupSpace,
  shareOsqueryPackagePoliciesToSpace,
} from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

const testSpaces = [
  { name: 'default', tags: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  { name: 'custom-space', tags: [...tags.stateful.classic] },
];

for (const testSpace of testSpaces) {
  test.describe(`ALL - Custom space [${testSpace.name}]`, { tag: testSpace.tags }, () => {
    let packName: string;
    let packId: string;
    let spaceId: string;

    test.beforeAll(async ({ kbnClient }) => {
      if (testSpace.name !== 'default') {
        const space = await loadSpace(kbnClient);
        spaceId = space.id;

        // Fleet space awareness is enabled, so package policies are scoped per-space.
        // Share the osquery package policies from the default space to the custom space
        // so the osquery status check finds them.
        await shareOsqueryPackagePoliciesToSpace(kbnClient, spaceId);
      } else {
        spaceId = 'default';
      }

      // Initialize lists index (mirrors Cypress initializeDataViews)
      try {
        await kbnClient.request({
          method: 'POST',
          path: '/api/lists/index',
        });
      } catch {
        // Ignore - may already exist
      }

      const pack = await loadPack(
        kbnClient,
        {
          queries: {
            test: {
              interval: 10,
              query: 'select * from uptime;',
              ecs_mapping: {},
            },
          },
        },
        spaceId
      );
      packId = pack.saved_object_id;
      packName = pack.name;
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(socManagerRole);
    });

    test.afterAll(async ({ kbnClient }) => {
      await cleanupPack(kbnClient, packId, spaceId);
      if (testSpace.name !== 'default') {
        await cleanupSpace(kbnClient, spaceId);
      }
    });

    test('Discover should be opened in new tab in results table', async ({
      page,
      pageObjects,
      kbnUrl,
    }) => {
      test.setTimeout(180_000); // Live queries can take time for agents to respond

      // Navigate to osquery page in the space
      await page.goto(kbnUrl.get(`/s/${spaceId}/app/osquery`));
      await page.testSubj.locator('newLiveQueryButton').click();
      await waitForPageReady(page);
      await pageObjects.liveQuery.selectAllAgents();
      await pageObjects.liveQuery.inputQuery('select * from uptime;');
      await pageObjects.liveQuery.submitQuery();
      await pageObjects.liveQuery.checkResults();

      // eslint-disable-next-line playwright/no-nth-methods -- single live query; only one result section
      const discoverLocator = page.testSubj.locator('viewInDiscover').first();
      await expect(discoverLocator).toBeVisible({ timeout: 60_000 });
      // eslint-disable-next-line playwright/no-nth-methods -- single live query; only one result section
      await expect(page.testSubj.locator('viewInLens').first()).toBeVisible({
        timeout: 60_000,
      });
      // eslint-disable-next-line playwright/no-nth-methods -- single live query; only one result section
      await expect(page.testSubj.locator('addToCaseButton').first()).toBeVisible({
        timeout: 60_000,
      });

      // Verify Discover link works
      // eslint-disable-next-line playwright/no-nth-methods -- first visible result
      const discoverLink = page.testSubj.locator('viewInDiscover').first();
      await expect(discoverLink).toBeVisible({ timeout: 30_000 });
      await expect(discoverLink).toHaveAttribute('href');
      const href = await discoverLink.evaluate((el) =>
        (el as HTMLAnchorElement).getAttribute('href')
      );
      expect(href).toBeTruthy();

      const baseUrl = new URL(page.url()).origin;
      await page.goto(`${baseUrl}${href!}`);

      const docTable = page.testSubj.locator('discoverDocTable');
      const discoverStart = Date.now();
      while (Date.now() - discoverStart < 120_000) {
        if (await docTable.isVisible({ timeout: 10_000 }).catch(() => false)) break;
        await page.reload();
      }

      await expect(docTable).toBeVisible({ timeout: 30_000 });
      await expect(page.testSubj.locator('discoverDocTable').getByText('action_data')).toBeVisible({
        timeout: 30_000,
      });
    });

    test('runs packs normally', async ({ page, pageObjects, kbnUrl }) => {
      test.setTimeout(180_000); // Live queries can take time for agents to respond

      await page.goto(kbnUrl.get(`/s/${spaceId}/app/osquery`));
      await waitForPageReady(page);

      // Navigate to Packs tab — try link first, fall back to direct navigation
      const packsLink = page.getByRole('link', { name: 'Packs' });
      if (await packsLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await packsLink.click();
      } else {
        await page.goto(kbnUrl.get(`/s/${spaceId}/app/osquery/packs`));
      }
      await waitForPageReady(page);

      // Handle pagination - the pack may be on page 2 due to accumulated packs from previous runs
      const playButton = page.testSubj.locator(`play-${packName}-button`);
      if (!(await playButton.isVisible({ timeout: 3_000 }).catch(() => false))) {
        const nextPageLink = page.getByRole('link', { name: 'Next page' });
        while (await nextPageLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await nextPageLink.click();
          await page.testSubj
            .locator('globalLoadingIndicator')
            .waitFor({ state: 'hidden', timeout: 1000 })
            .catch(() => { });
          if (await playButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
            break;
          }
        }
      }

      await playButton.click();
      await pageObjects.liveQuery.selectAllAgents();
      await page.testSubj.locator('liveQuerySubmitButton').click();
      await pageObjects.liveQuery.checkResults();
    });
  });
}
