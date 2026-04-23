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
import { tags } from '@kbn/scout';
import type { KbnClient } from '@kbn/scout';
import { customSpaceUiTest as test } from '../fixtures';
import {
  shareOsqueryPoliciesWithSpace,
  waitForAtLeastOneAgentOnline,
} from '../helpers/fleet_agents';
import { waitForLiveQueryComplete } from '../helpers/poll_live_query_history';

/**
 * Read-after-write verification for `shareOsqueryPoliciesWithSpace`.
 * The PATCH against `/api/fleet/agent_policies/{id}` returns immediately on
 * stateful classic but can lag a second or two on serverless before the
 * policy's `space_ids` is observable via GET. The UI renders an empty-state
 * "Add Osquery Manager" card when it navigates into the space while the
 * policies are still default-only. This helper blocks until every "Default
 * policy" / "Osquery policy" row actually lists the target space, so the
 * subsequent UI navigation isn't racing reconciliation.
 */
async function waitForPolicySpaceShareVisible(
  kbnClient: KbnClient,
  spaceId: string,
  {
    timeoutMs = 30_000,
    pollIntervalMs = 1_000,
  }: { timeoutMs?: number; pollIntervalMs?: number } = {}
): Promise<void> {
  if (!spaceId || spaceId === 'default') return;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { data } = await kbnClient.request<{
      items: Array<{ space_ids?: string[] }>;
    }>({
      method: 'GET',
      path: '/api/fleet/agent_policies',
      query: {
        kuery: 'ingest-agent-policies.name:("Default policy" or "Osquery policy")',
        perPage: 50,
      },
    });

    const allShared =
      data.items.length > 0 && data.items.every((p) => (p.space_ids ?? []).includes(spaceId));
    if (allShared) return;

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `waitForPolicySpaceShareVisible: policies still not visible in space ${spaceId} after ${Math.round(
      timeoutMs / 1000
    )}s`
  );
}

const localTags = [...tags.stateful.classic, ...tags.serverless.security.complete];

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
    // PATCH returns before the policy reconciles into the target space on
    // serverless. Block until the read-path confirms `space_ids` includes
    // the Scout space — otherwise the first UI navigation into the space can
    // render the "Add Osquery Manager" empty state and the test fails early.
    await waitForPolicySpaceShareVisible(kbnClient, scoutSpace.id);
  });

  test.afterAll(async ({ apiServices, scoutSpace, log }) => {
    if (packId) {
      // osquery packs.delete already handles 404 via `ignoreErrors: [404]`.
      await apiServices.osquery.packs.delete(packId);
    }

    if (restoreOsqueryPolicies) {
      await restoreOsqueryPolicies().catch((err: Error) =>
        log.debug(`restoreOsqueryPolicies failed: ${err.message}`)
      );
    }

    // Skill-mandated catch-all for spaceTest-based specs: removes any
    // standard-list SOs the test harness tracked inside the Scout space.
    // Runs AFTER the domain-specific cleanup so a failure there still lets the
    // generic sweep fire.
    await scoutSpace.savedObjects
      .cleanStandardList()
      .catch((err: Error) => log.debug(`cleanStandardList failed: ${err.message}`));
  });

  test('runs a live query in the custom space and asserts the Discover link routes to that space', async ({
    browserAuth,
    page,
    context,
    kbnClient,
    scoutSpace,
    pageObjects,
  }) => {
    // 6 min: space-create + policy-share + space-scoped UI navigation (which
    // can re-mount on first render) + agent-dependent submit + Discover popup.
    test.setTimeout(360_000);

    await waitForAtLeastOneAgentOnline(kbnClient);
    await browserAuth.loginAsOsqueryPowerUser();

    await test.step('navigate to new live query in custom space', async () => {
      await pageObjects.osqueryCustomSpace.gotoNewLiveQueryInSpace(scoutSpace.id);
    });

    await test.step('submit query against all agents', async () => {
      await pageObjects.osqueryLiveQueryForm.selectAllAgents();
      await pageObjects.osqueryLiveQueryForm.clearAndInputQuery('select * from uptime;');
      const actionId = await pageObjects.osqueryLiveQueryForm.submitQuery();
      if (actionId) {
        await waitForLiveQueryComplete(kbnClient, actionId, { spaceId: scoutSpace.id });
      }

      await pageObjects.osqueryLiveQueryForm.waitForSingleQueryResults();
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
    // 6 min: pack seed + space-scoped UI pack-run + agent-dependent results.
    test.setTimeout(360_000);

    await waitForAtLeastOneAgentOnline(kbnClient);
    await browserAuth.loginAsOsqueryPowerUser();

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
    const actionId = await pageObjects.osqueryLiveQueryForm.submitQuery();
    if (actionId) {
      await waitForLiveQueryComplete(kbnClient, actionId, { spaceId: scoutSpace.id });
    }

    await pageObjects.osqueryLiveQueryForm.waitForPackResults();
  });
});
