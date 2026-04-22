/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This is the ONLY file in Phases 5.1 / 5.2 / 5.3a that exercises `/s/{spaceId}/...` routing.
 * It was previously covered by `custom_space.cy.ts` (tagged `@brokenInServerless`).
 * Local-only because it requires a live Fleet stack and agent enrollment via `global.setup.ts`.
 *
 * Phase 5.4 will extend `uiTest` to use `spaceTest` broadly; for now this spec is the sole
 * non-default-space test, using `customSpaceUiTest` which extends Scout's `spaceTest`.
 */

import { expect } from '@kbn/scout/ui';
import { customSpaceUiTest as test } from '../fixtures';
import {
  shareOsqueryPoliciesWithSpace,
  waitForAtLeastOneAgentOnline,
} from '../helpers/fleet_agents';

const localTags = ['@local-stateful-classic', '@local-serverless-security_complete'];

test.describe('Osquery in a custom space', { tag: localTags }, () => {
  let packId: string | undefined;
  let restoreOsqueryPolicies: (() => Promise<void>) | undefined;

  // `global.setup.ts` installs `osquery_manager` only in the `default` space,
  // so without this share step the osquery app in `scoutSpace` renders its
  // "Add Osquery Manager" empty state and `liveQuerySubmitButton` / the packs
  // list never appear. Sharing attaches the same enrolled Docker agents to the
  // new space too, which is what these tests need.
  test.beforeAll(async ({ kbnClient, scoutSpace }) => {
    restoreOsqueryPolicies = await shareOsqueryPoliciesWithSpace(kbnClient, scoutSpace.id);
  });

  test.afterAll(async ({ apiServices }) => {
    if (packId) {
      await apiServices.osquery.packs.delete(packId).catch(() => {});
    }

    if (restoreOsqueryPolicies) {
      await restoreOsqueryPolicies().catch(() => {});
    }
  });

  test('runs a live query in the custom space and asserts the Discover link routes to that space', async ({
    browserAuth,
    page,
    context,
    kbnClient,
    scoutSpace,
    pageObjects,
  }) => {
    test.setTimeout(360_000);

    await waitForAtLeastOneAgentOnline(kbnClient);
    await browserAuth.loginAsAdmin();

    await test.step('navigate to new live query in custom space', async () => {
      await pageObjects.osqueryCustomSpace.gotoNewLiveQueryInSpace(scoutSpace.id);
    });

    await test.step('submit query against all agents', async () => {
      await pageObjects.osqueryLiveQueryForm.selectAllAgents();
      await pageObjects.osqueryLiveQueryForm.clearAndInputQuery('select * from uptime;');
      await pageObjects.osqueryLiveQueryForm.submitQuery();
      await pageObjects.osqueryLiveQueryForm.waitForResults();
      await expect(pageObjects.osqueryLiveQueryForm.resultsTable).toBeVisible({ timeout: 180_000 });
    });

    await test.step('Discover link routes to the custom space', async () => {
      const discoverLink = page.locator(
        `a[href*="/s/${scoutSpace.id}/app/discover"][target="_blank"]`
      );
      await discoverLink.waitFor({ state: 'visible', timeout: 60_000 });
      const [newPage] = await Promise.all([
        context.waitForEvent('page', { timeout: 60_000 }),
        discoverLink.click(),
      ]);
      await newPage.waitForLoadState('domcontentloaded');
      expect(newPage.url()).toContain(`/s/${scoutSpace.id}/app/discover`);
      await newPage.close();
    });
  });

  test('runs a pack in the custom space and verifies results render', async ({
    browserAuth,
    kbnClient,
    scoutSpace,
    apiServices,
    pageObjects,
  }) => {
    test.setTimeout(360_000);

    await waitForAtLeastOneAgentOnline(kbnClient);
    await browserAuth.loginAsAdmin();

    const packName = `scout-custom-space-pack-${Date.now()}`;
    const packResp = await apiServices.osquery.packs.create({
      name: packName,
      enabled: true,
      description: 'scout custom space pack test',
      shards: {},
      policy_ids: [],
      queries: { q1: { ecs_mapping: {}, interval: 60, query: 'select * from uptime;' } },
    });
    packId = (packResp.data as { data: { saved_object_id: string } }).data.saved_object_id;

    await pageObjects.osqueryCustomSpace.gotoPacksInSpace(scoutSpace.id);
    await pageObjects.osqueryCustomSpace.runPackByName(packName);
    await pageObjects.osqueryLiveQueryForm.selectAllAgents();
    await pageObjects.osqueryLiveQueryForm.submitQuery();
    await pageObjects.osqueryLiveQueryForm.waitForResults();
    await expect(pageObjects.osqueryLiveQueryForm.resultsTable).toBeVisible({ timeout: 180_000 });
  });
});
