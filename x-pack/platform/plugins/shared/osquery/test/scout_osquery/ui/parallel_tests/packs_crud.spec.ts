/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import { getMinimalSavedQuery } from '../../api/fixtures/constants';
import { OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS } from '../../common/scout_parallel_ui_tags';

test.describe('Pack CRUD from UI', { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS }, () => {
  let savedQueryId: string;
  let savedQueryLabel: string;
  // Extra saved query for edit attach (primary id already in pack — avoids flyout id collision).
  let extraSavedQueryId: string;
  let extraSavedQueryLabel: string;
  const transientPackIds: string[] = [];

  test.beforeAll(async ({ apiServices }) => {
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

  test.afterEach(async ({ apiServices }) => {
    while (transientPackIds.length > 0) {
      const id = transientPackIds.pop();
      if (id) await apiServices.osquery.packs.delete(id);
    }
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
    // 5 min: create pack + Fleet verify + Lens popup + delete.
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
    expect(Object.keys(queries ?? {})).toHaveLength(1);

    await pageObjects.osqueryPackForm.setPagination50Rows();
    await pageObjects.osqueryPackForm.openPackFromList(packName);

    await test.step('captures the Lens locator params for pack results', async () => {
      const viewInLensButton = page.getByLabel('View in Lens');
      await viewInLensButton.waitFor({ state: 'visible', timeout: 30_000 });
      // waitForEvent(popup) before click. Assert filter badge (Lens URL lacks app state in querystring).
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
    // 5 min: API seed + UI attach second query + update.
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
    transientPackIds.push(packId);

    await pageObjects.osqueryPackForm.navigateToPacksList();
    await pageObjects.osqueryPackForm.setPagination50Rows();
    await pageObjects.osqueryPackForm.openPackFromList(packName);
    await pageObjects.osqueryPackForm.openEditPack();
    await pageObjects.osqueryPackForm.openAddQueryFlyout();

    // Use extraSavedQueryLabel — primary is already in pack (unique id constraint).
    await pageObjects.osqueryPackForm.attachSavedQuery(extraSavedQueryLabel);
    // ID field populated = RHF caught attach (deterministic vs fixed sleep over debounce).
    await expect(pageObjects.osqueryPackForm.queryIdInput).toHaveValue(extraSavedQueryLabel, {
      timeout: 15_000,
    });
    await pageObjects.osqueryPackForm.saveQueryFlyout();
    await pageObjects.osqueryPackForm.updatePack();
    await expect(page.getByText(`Successfully updated "${packName}" pack`)).toBeVisible();
  });

  test('deletes a pack from the edit page', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
  }) => {
    // 5 min: API seed + UI delete + list assertion.
    test.setTimeout(300_000);
    await browserAuth.loginAsOsqueryPowerUser();

    // API seed — create path covered by first test.
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
    // afterEach delete is idempotent if UI delete partially fails.
    transientPackIds.push(packId);

    // Deep-link to edit (list can be empty-state after prior deletes — pagination missing).
    await page.gotoApp(`osquery/packs/${packId}/edit`);
    await page.getByRole('button', { name: /^Delete pack$/ }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByText(/Successfully deleted/)).toBeVisible({ timeout: 30_000 });

    // List should not link to deleted pack (may be empty-state — link hidden is enough).
    await pageObjects.osqueryPackForm.navigateToPacksList();
    await expect(page.getByRole('link', { name: packName })).toBeHidden();
  });
});
