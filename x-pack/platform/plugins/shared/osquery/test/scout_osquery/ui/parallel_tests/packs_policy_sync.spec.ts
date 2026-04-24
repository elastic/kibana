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

const localTags = [...tags.stateful.classic, ...tags.serverless.security.complete];

test.describe('Pack Fleet policy sync', { tag: localTags }, () => {
  let savedQueryId: string;
  let savedQueryLabel: string;
  // Per-test packs get tracked here so `afterEach` can clean them without
  // requiring try/finally inside test bodies.
  const transientPackIds: string[] = [];

  test.beforeAll(async ({ apiServices }) => {
    // Orphan `scout-policy-*` / `scout-dup-*` cleanup is handled once per
    // environment by the defensive-cleanup globalSetupHook.

    const body = getMinimalSavedQuery({
      id: `scout-policy-sq-${Date.now()}`,
      query: 'select * from uptime;',
      interval: '3600',
    });
    const created = await apiServices.osquery.savedQueries.create(body);
    const inner = (created.data as { data: { saved_object_id: string; id: string } }).data;
    savedQueryId = inner.saved_object_id;
    savedQueryLabel = inner.id;
  });

  test.afterEach(async ({ apiServices }) => {
    while (transientPackIds.length > 0) {
      const id = transientPackIds.pop();
      if (id) await apiServices.osquery.packs.delete(id);
    }
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.osquery.savedQueries.delete(savedQueryId);
  });

  interface FleetPackPolicyItem {
    name: string;
    inputs?: Array<{ config?: { osquery?: { value?: { packs?: Record<string, unknown> } } } }>;
  }

  test('toggles pack active state and observes Fleet policy updates', async ({
    browserAuth,
    pageObjects,
    apiServices,
  }) => {
    // 5 min: pack seed + UI toggle + confirmation modal + Fleet policy PUT
    // read-after-write + toggle back.
    test.setTimeout(300_000);
    await browserAuth.loginAsOsqueryPowerUser();

    const policiesResponse = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
    const firstPolicyId = (policiesResponse.data as { items: Array<{ policy_ids: string[] }> })
      .items[0]?.policy_ids?.[0];
    expect(firstPolicyId).toBeDefined();

    const packName = `scout-policy-pack-${Date.now()}`;
    const created = await apiServices.osquery.packs.create({
      name: packName,
      enabled: true,
      description: 'scout',
      shards: {},
      policy_ids: [firstPolicyId!],
      queries: {
        q1: { ecs_mapping: {}, interval: 60, query: 'select * from uptime;' },
      },
    });
    const packId = (created.data as { data: { saved_object_id: string } }).data.saved_object_id;
    transientPackIds.push(packId);

    await pageObjects.osqueryPackForm.navigateToPacksList();
    await pageObjects.osqueryPackForm.setPagination50Rows();
    await pageObjects.osqueryPackForm.togglePackActiveFromList(packName);
    // Toggling pack state re-writes the Fleet package policy; Fleet
    // surfaces a confirmation modal that must be confirmed before the next
    // action can proceed.
    await pageObjects.osqueryPackForm.confirmPolicyChangeModal();

    const packKey = `default--${packName}`;
    await expect
      .poll(
        async () => {
          const policies = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
          const items = (policies.data as { items: FleetPackPolicyItem[] }).items;
          const match = items.find((p) => p.name === 'Policy for Default policy');
          const packsAfterDisable = match?.inputs?.[0]?.config?.osquery?.value?.packs ?? {};

          return Object.prototype.hasOwnProperty.call(packsAfterDisable, packKey);
        },
        { timeout: 120_000 }
      )
      .toBe(false);

    await pageObjects.osqueryPackForm.togglePackActiveFromList(packName);
    await pageObjects.osqueryPackForm.confirmPolicyChangeModal();

    await expect
      .poll(
        async () => {
          const policies = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
          const items = (policies.data as { items: FleetPackPolicyItem[] }).items;
          const match = items.find((p) => p.name === 'Policy for Default policy');
          const packsAfterEnable = match?.inputs?.[0]?.config?.osquery?.value?.packs ?? {};

          return Object.prototype.hasOwnProperty.call(packsAfterEnable, packKey);
        },
        // Re-enable + Fleet PUT can lag disable on cold serverless stacks.
        { timeout: 180_000 }
      )
      .toBe(true);
  });

  test('duplicates a pack from the kebab menu with a _copy suffix', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
  }) => {
    // 5 min: pack seed + UI kebab menu + duplicate server flow + edit-page
    // load + list lookup for cleanup tracking.
    test.setTimeout(300_000);
    await browserAuth.loginAsOsqueryPowerUser();

    const policiesResponse = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
    const firstPolicyId = (policiesResponse.data as { items: Array<{ policy_ids: string[] }> })
      .items[0]?.policy_ids?.[0];
    expect(firstPolicyId).toBeDefined();

    const packName = `scout-dup-${Date.now()}`;
    const created = await apiServices.osquery.packs.create({
      name: packName,
      enabled: true,
      description: 'scout',
      shards: {},
      policy_ids: [firstPolicyId!],
      queries: {
        [savedQueryLabel]: { ecs_mapping: {}, interval: 60, query: 'select * from uptime;' },
      },
    });
    const packId = (created.data as { data: { saved_object_id: string } }).data.saved_object_id;
    transientPackIds.push(packId);

    await pageObjects.osqueryPackForm.navigateToPacksList();
    await pageObjects.osqueryPackForm.setPagination50Rows();
    await pageObjects.osqueryPackForm.clickPackRowKebab(packName);
    await pageObjects.osqueryPackForm.chooseContextMenuItem(/Duplicate/);

    // Duplicate opens the pack-edit page pre-filled with `${packName}_copy`; assert
    // via the pack-name input so we're not depending on text anywhere on the page
    // (the list no longer shows the copy until after save). The suffix is an
    // underscore, not a dash — see `server/routes/utils/generate_copy_name.ts` and
    // the OpenAPI contract docs.
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toHaveValue(`${packName}_copy`, { timeout: 30_000 });

    // `POST /api/osquery/packs/{id}/copy` persists the `_copy` pack server-side and
    // navigates here in edit mode — there is no `save-pack-button` (create-only).
    const copyPackName = `${packName}_copy`;
    await expect
      .poll(
        async () => {
          const listed = await apiServices.osquery.packs.list();
          const rows = (listed.data as { data: Array<{ name?: string }> }).data;

          return rows.some((p) => p.name === copyPackName);
        },
        { timeout: 60_000 }
      )
      .toBe(true);

    const packs = await apiServices.osquery.packs.list();
    const dupItems = (packs.data as { data: Array<{ name?: string; saved_object_id: string }> })
      .data;
    const duplicatePackId = dupItems.find((p) => p.name === copyPackName)?.saved_object_id;
    expect(
      duplicatePackId,
      `duplicate pack ${packName}_copy should persist after save`
    ).toBeDefined();
    transientPackIds.push(duplicatePackId!);
  });
});
