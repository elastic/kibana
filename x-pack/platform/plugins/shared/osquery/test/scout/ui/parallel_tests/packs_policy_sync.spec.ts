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
    const firstPolicyId = (policiesResponse.data as { items: Array<{ policy_ids: string[] }> }).items[0]
      ?.policy_ids?.[0];
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

    await pageObjects.osqueryPackForm.navigateToPacksList();
    await pageObjects.osqueryPackForm.setPagination50Rows();
    await pageObjects.osqueryPackForm.togglePackActiveFromList(packName);

    const afterToggle = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
    const items = (afterToggle.data as { items: Array<{ name: string; enabled?: boolean }> }).items;
    const match = items.find((p) => p.name === `Policy for Default policy`);
    expect(match).toBeDefined();

    await pageObjects.osqueryPackForm.togglePackActiveFromList(packName);

    await apiServices.osquery.packs.delete(packId);
  });

  test('duplicates a pack from the kebab menu with a -copy suffix', async ({ browserAuth, page, pageObjects, apiServices }) => {
    test.setTimeout(300_000);
    await browserAuth.loginAsAdmin();

    const policiesResponse = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
    const firstPolicyId = (policiesResponse.data as { items: Array<{ policy_ids: string[] }> }).items[0]
      ?.policy_ids?.[0];
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

    await pageObjects.osqueryPackForm.navigateToPacksList();
    await pageObjects.osqueryPackForm.setPagination50Rows();
    await pageObjects.osqueryPackForm.clickPackRowKebab(packName);
    await pageObjects.osqueryPackForm.chooseContextMenuItem(/Duplicate/);
    await expect(page.getByText(`${packName}-copy`)).toBeVisible();

    const list = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
    const names = (list.data as { items: Array<{ name?: string }> }).items.map((i) => i.name);
    expect(names.some((n) => n?.includes(`${packName}-copy`) || n?.includes(packName))).toBeTruthy();

    await apiServices.osquery.packs.delete(packId);
  });
});
