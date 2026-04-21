/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import { getMinimalSavedQuery } from '../../api/fixtures/constants';

const localTags = ['@local-stateful-classic', '@local-serverless-security_complete'];

test.describe('Pack Fleet policy sync', { tag: localTags }, () => {
  let savedQueryId: string;
  let savedQueryLabel: string;

  test.beforeAll(async ({ apiServices }) => {
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

  test.afterAll(async ({ apiServices }) => {
    await apiServices.osquery.savedQueries.delete(savedQueryId);
  });

  test('toggles pack active state and observes Fleet policy updates', async ({
    browserAuth,
    pageObjects,
    apiServices,
  }) => {
    test.setTimeout(300_000);
    await browserAuth.loginAsAdmin();

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

    try {
      await pageObjects.osqueryPackForm.navigateToPacksList();
      await pageObjects.osqueryPackForm.setPagination50Rows();
      await pageObjects.osqueryPackForm.togglePackActiveFromList(packName);
      // Toggling pack state re-writes the Fleet package policy; a confirmation
      // modal can sit on top of the list until dismissed, blocking the next click.
      await pageObjects.osqueryPackForm.confirmPolicyChangeModalIfVisible();

      const afterToggle = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
      const items = (afterToggle.data as { items: Array<{ name: string; enabled?: boolean }> })
        .items;
      const match = items.find((p) => p.name === `Policy for Default policy`);
      expect(match).toBeDefined();

      await pageObjects.osqueryPackForm.togglePackActiveFromList(packName);
      await pageObjects.osqueryPackForm.confirmPolicyChangeModalIfVisible();
    } finally {
      await apiServices.osquery.packs.delete(packId);
    }
  });

  test('duplicates a pack from the kebab menu with a _copy suffix', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
  }) => {
    test.setTimeout(300_000);
    await browserAuth.loginAsAdmin();

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

    let duplicatePackId: string | undefined;
    try {
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

      // Find the persisted duplicate saved object so cleanup can remove it —
      // relying on the UI toast alone would leak the copy across CI runs.
      const packs = await apiServices.osquery.packs.list();
      const items = (packs.data as { data: Array<{ name?: string; saved_object_id: string }> })
        .data;
      duplicatePackId = items.find((p) => p.name === `${packName}_copy`)?.saved_object_id;
    } finally {
      await apiServices.osquery.packs.delete(packId);
      if (duplicatePackId) {
        await apiServices.osquery.packs.delete(duplicatePackId);
      }
    }
  });
});
