/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security';
import { test } from '../fixtures';
import { socManagerRole } from '../../common/roles';
import {
  loadPack,
  cleanupPack,
  loadSpace,
  cleanupSpace,
  shareOsqueryPackagePoliciesToSpace,
} from '../../common/api_helpers';
import { waitForPageReady } from '../../common/constants';

const testSpaces = [
  { name: 'default', tags: ['@ess'] as const },
  { name: 'custom-space', tags: ['@ess'] as const },
];

for (const testSpace of testSpaces) {
  test.describe(
    `ALL - Custom space [${testSpace.name}]`,
    { tag: testSpace.tags as unknown as string[] },
    () => {
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
        test.slow(); // Live queries can take time for agents to respond

        // Navigate to osquery page in the space
        await page.goto(kbnUrl.get(`/s/${spaceId}/app/osquery`));
        await waitForPageReady(page);
        await page.getByText('New live query').first().click();
        await waitForPageReady(page);
        await pageObjects.liveQuery.selectAllAgents();
        await pageObjects.liveQuery.inputQuery('select * from uptime;');
        await pageObjects.liveQuery.submitQuery();
        await pageObjects.liveQuery.checkResults();

        // Check action items - wait for results to fully load
        await expect(page.getByText('View in Discover').first()).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText('View in Lens').first()).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText('Add to Case').first()).toBeVisible({ timeout: 30_000 });

        // Verify Discover link works
        const discoverLink = page.getByRole('link', { name: 'View in Discover' }).first();
        await expect(discoverLink).toBeVisible({ timeout: 30_000 });
        const href = await discoverLink.getAttribute('href');
        expect(href).toBeTruthy();

        if (href) {
          // href is relative, need to construct absolute URL
          const baseUrl = new URL(page.url()).origin;
          await page.goto(`${baseUrl}${href}`);
          await waitForPageReady(page);
          await expect(page.testSubj.locator('discoverDocTable')).toBeVisible({ timeout: 60_000 });
          await expect(
            page.getByText(/action_data.*select \* from uptime;/).first()
          ).toBeVisible();
        }
      });

      test('runs packs normally', async ({ page, pageObjects, kbnUrl }) => {
        test.slow(); // Live queries can take time for agents to respond

        await page.goto(kbnUrl.get(`/s/${spaceId}/app/osquery`));
        await waitForPageReady(page);
        await page.getByText('Packs').first().click();
        await waitForPageReady(page);

        // Handle pagination - the pack may be on page 2 due to accumulated packs from previous runs
        const playButton = page.testSubj.locator(`play-${packName}-button`);
        if (!(await playButton.isVisible({ timeout: 3_000 }).catch(() => false))) {
          const nextPageLink = page.getByRole('link', { name: 'Next page' });
          while (await nextPageLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await nextPageLink.click();
            await page.waitForTimeout(1000);
            if (await playButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
              break;
            }
          }
        }
        await playButton.click();
        await pageObjects.liveQuery.selectAllAgents();
        await page.getByText('Submit').first().click();
        await pageObjects.liveQuery.checkResults();
      });
    }
  );
}
