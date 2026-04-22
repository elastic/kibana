/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { uiTest as test } from '../fixtures';
import { getMinimalSavedQuery } from '../../api/fixtures/constants';
import {
  cleanOsqueryPacksByPrefix,
  cleanOsquerySavedQueriesByPrefix,
} from '../helpers/defensive_cleanup';

const localTags = [...tags.stateful.classic, ...tags.serverless.security.complete];
const PACK_PREFIXES = ['scout-pack-', 'scout-pack-edit-', 'scout-pack-delete-'];
const SAVED_QUERY_PREFIXES = ['scout-pack-sq-', 'scout-pack-sq-extra-'];

test.describe('Pack CRUD from UI', { tag: localTags }, () => {
  let savedQueryId: string;
  let savedQueryLabel: string;
  // Second saved query reserved for the edit test's `attachSavedQuery` step —
  // the primary `savedQueryLabel` is already baked into the pack created by
  // that test, so attaching it again would collide on the query-id uniqueness
  // check inside the flyout (`idSet`).
  let extraSavedQueryId: string;
  let extraSavedQueryLabel: string;

  test.beforeAll(async ({ apiServices }) => {
    // Defensive: a previously-crashed run may have left `scout-pack-*` SOs
    // behind. Clean them before seeding this run's fixtures so Fleet policy
    // sync doesn't surface a stale pack on our agents.
    await cleanOsqueryPacksByPrefix(apiServices, PACK_PREFIXES);
    await cleanOsquerySavedQueriesByPrefix(apiServices, SAVED_QUERY_PREFIXES);

    const body = getMinimalSavedQuery({
      id: `scout-pack-sq-${Date.now()}`,
      query: 'select * from uptime;',
      interval: '3600',
    });
    const created = await apiServices.osquery.savedQueries.create(body);
    const inner = (created.data as { data: { saved_object_id: string; id: string } }).data;
    savedQueryId = inner.saved_object_id;
    savedQueryLabel = inner.id;

    const extraBody = getMinimalSavedQuery({
      id: `scout-pack-sq-extra-${Date.now()}`,
      query: 'select * from os_version;',
      interval: '3600',
    });
    const extraCreated = await apiServices.osquery.savedQueries.create(extraBody);
    const extraInner = (extraCreated.data as { data: { saved_object_id: string; id: string } })
      .data;
    extraSavedQueryId = extraInner.saved_object_id;
    extraSavedQueryLabel = extraInner.id;
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.osquery.savedQueries.delete(savedQueryId);
    await apiServices.osquery.savedQueries.delete(extraSavedQueryId);
  });

  test('creates a pack from a saved query and verifies Fleet-backed query shape', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
  }) => {
    test.setTimeout(300_000);
    await browserAuth.loginAsOsqueryPowerUser();

    const packName = `scout-pack-${Date.now()}`;

    await pageObjects.osqueryPackForm.navigateToPacksList();
    await pageObjects.osqueryPackForm.openCreatePackFlyout();
    await pageObjects.osqueryPackForm.fillPackName(packName);
    await pageObjects.osqueryPackForm.selectPolicy('Default policy');
    await pageObjects.osqueryPackForm.openAddQueryFlyout();
    await pageObjects.osqueryPackForm.attachSavedQuery(savedQueryLabel);
    await pageObjects.osqueryPackForm.setQueryIntervalSeconds('5');
    await pageObjects.osqueryPackForm.saveQueryFlyout();
    await expect(page.getByText(savedQueryLabel)).toBeVisible();
    await pageObjects.osqueryPackForm.saveNewPack();
    await expect(page.getByText(`Successfully created "${packName}" pack`)).toBeVisible();

    interface FleetPolicyItem {
      name?: string;
      inputs?: Array<{
        config?: { osquery?: { value?: { packs?: Record<string, unknown> } } };
      }>;
    }
    const policiesResponse = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
    const listBody = policiesResponse.data as { items?: FleetPolicyItem[] };
    const items = listBody.items ?? [];
    const policyForDefault = items.find((p) => p.name === 'Policy for Default policy');

    expect(policyForDefault).toBeDefined();
    const packKey = `default--${packName}`;
    const packs = policyForDefault?.inputs?.[0]?.config?.osquery?.value?.packs ?? {};
    expect(packs).toHaveProperty(packKey);
    const queries = (packs as Record<string, { queries?: Record<string, unknown> }>)[packKey]
      ?.queries;
    expect(queries).toBeDefined();
    expect(Object.keys(queries ?? {}).length).toBeGreaterThan(0);

    await pageObjects.osqueryPackForm.setPagination50Rows();
    await pageObjects.osqueryPackForm.openPackFromList(packName);

    await test.step('captures the Lens locator params for pack results', async () => {
      const viewInLensButton = page.getByLabel('View in Lens');
      await viewInLensButton.waitFor({ state: 'visible', timeout: 30_000 });
      // Register the popup listener BEFORE triggering the click so no event is
      // missed under CI load (serverless security_complete previously flaked
      // here). Assert on the Unified Search filter badge rather than the URL —
      // Lens stores its `_a` app state in browser session storage, so the URL
      // is only `/app/lens#/edit_by_value?_g=...` with no pack-name fragment.
      // The pack's `action_id` lands in the filter bar as a filter badge
      // (`action_id: pack_default--${packName}_${savedQueryLabel}`), and that
      // badge is the reliable cross-arch signal. `[data-test-subj^="filter-badge"]`
      // comes from Unified Search's `filter_view/index.tsx`.
      const popupPromise = page.waitForEvent('popup', { timeout: 30_000 });
      await viewInLensButton.click();
      const popup = await popupPromise;
      const actionIdFragment = `pack_default--${packName}`;
      const filterBadge = popup.locator('[data-test-subj^="filter-badge"]').filter({
        hasText: actionIdFragment,
      });
      await expect(filterBadge).toBeVisible({ timeout: 30_000 });
      await popup.close();
    });

    await pageObjects.osqueryPackForm.openEditPack();
    await page.getByRole('button', { name: /^Delete pack$/ }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText(/Successfully deleted/)).toBeVisible();
  });

  test('edits pack queries from the UI', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
  }) => {
    test.setTimeout(300_000);
    await browserAuth.loginAsOsqueryPowerUser();

    const policiesResponse = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
    const firstPolicyId = (policiesResponse.data as { items: Array<{ policy_ids: string[] }> })
      .items[0]?.policy_ids?.[0];
    expect(firstPolicyId).toBeDefined();

    const packName = `scout-pack-edit-${Date.now()}`;
    const created = await apiServices.osquery.packs.create({
      name: packName,
      enabled: true,
      description: 'scout',
      shards: {},
      policy_ids: [firstPolicyId!],
      queries: {
        [savedQueryLabel]: {
          ecs_mapping: {},
          interval: 60,
          query: 'select * from uptime;',
        },
      },
    });
    const packId = (created.data as { data: { saved_object_id: string } }).data.saved_object_id;

    await pageObjects.osqueryPackForm.navigateToPacksList();
    await pageObjects.osqueryPackForm.setPagination50Rows();
    await pageObjects.osqueryPackForm.openPackFromList(packName);
    await pageObjects.osqueryPackForm.openEditPack();
    await pageObjects.osqueryPackForm.openAddQueryFlyout();

    // Attach the SECOND saved query (the primary one is already baked into the
    // pack above, so reusing it would trip the flyout's query-id uniqueness
    // check). Attaching a saved query populates ID, query body, interval,
    // timeout, platform, and ECS mapping in one go — bypassing the manual-fill
    // path whose Monaco + ECS-mapping validation interactions were flaking
    // on save. Mirrors the Cypress `saved_queries.cy.ts` edit-pack flow.
    await pageObjects.osqueryPackForm.attachSavedQuery(extraSavedQueryLabel);
    // The flyout's save click fires RHF `handleSubmit` — the ECS editor runs a
    // 500ms debounce on its internal form state, and clicking Save before the
    // debounce flushes causes validation to silently fail. Cypress uses
    // `cy.wait(1000)` here; the same defensive wait applies to Playwright.
    await page.waitForTimeout(1000);
    await pageObjects.osqueryPackForm.saveQueryFlyout();
    await pageObjects.osqueryPackForm.updatePack();
    await expect(page.getByText(`Successfully updated "${packName}" pack`)).toBeVisible();

    await apiServices.osquery.packs.delete(packId);
  });

  test('deletes a pack from the edit page', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
  }) => {
    test.setTimeout(300_000);
    await browserAuth.loginAsOsqueryPowerUser();

    // Seed via API so the test focuses on the UI delete flow rather than the
    // create flow that is already covered by the first test in this file.
    const policiesResponse = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
    const firstPolicyId = (policiesResponse.data as { items: Array<{ policy_ids: string[] }> })
      .items[0]?.policy_ids?.[0];
    expect(firstPolicyId).toBeDefined();

    const packName = `scout-pack-delete-${Date.now()}`;
    const created = await apiServices.osquery.packs.create({
      name: packName,
      enabled: true,
      description: 'scout delete',
      shards: {},
      policy_ids: [firstPolicyId!],
      queries: {
        [savedQueryLabel]: {
          ecs_mapping: {},
          interval: 60,
          query: 'select * from uptime;',
        },
      },
    });
    const packId = (created.data as { data: { saved_object_id: string } }).data.saved_object_id;

    try {
      // Navigate directly to the pack's edit URL instead of routing through
      // the list + pagination. After the preceding tests' deletes run the
      // packs list can briefly render the "Load Elastic prebuilt packs"
      // empty-state (the pagination popover doesn't mount at all in that
      // state, which makes the previous `setPagination50Rows` flow time out).
      // The edit URL is stable and doesn't depend on list-render state.
      await page.gotoApp(`osquery/packs/${packId}/edit`);
      await page.getByRole('button', { name: /^Delete pack$/ }).click();
      await page.getByRole('button', { name: 'Confirm' }).click();

      await expect(page.getByText(/Successfully deleted/)).toBeVisible({ timeout: 30_000 });

      // After deletion the edit URL 404s; navigate to the list to confirm the
      // pack no longer appears. Scope to the page (list may be empty-state
      // again, in which case the pack-name link simply doesn't exist — that's
      // exactly the contract we want to assert).
      await pageObjects.osqueryPackForm.navigateToPacksList();
      await expect(page.getByRole('link', { name: packName })).toBeHidden();
    } finally {
      // Idempotent — the delete endpoint ignores 404 so this is a safety net
      // for cases where the UI flow partially completed before asserting.
      await apiServices.osquery.packs.delete(packId);
    }
  });
});
