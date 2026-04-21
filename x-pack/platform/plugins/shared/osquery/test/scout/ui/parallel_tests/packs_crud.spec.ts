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

test.describe('Pack CRUD from UI', { tag: localTags }, () => {
  let savedQueryId: string;
  let savedQueryLabel: string;

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
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.osquery.savedQueries.delete(savedQueryId);
  });

  test('creates a pack from a saved query and verifies Fleet-backed query shape', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
  }) => {
    test.setTimeout(300_000);
    await browserAuth.loginAsAdmin();

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

    const policiesResponse = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
    const listBody = policiesResponse.data as { items?: unknown[] };
    const items = listBody.items ?? [];
    const policyForDefault = items.find(
      (p: { name?: string }) => typeof p === 'object' && p !== null && p.name === 'Policy for Default policy'
    ) as { inputs?: Array<{ config?: { osquery?: { value?: { packs?: Record<string, unknown> } } } }> } | undefined;

    expect(policyForDefault).toBeDefined();
    const packKey = `default--${packName}`;
    const packs = policyForDefault?.inputs?.[0]?.config?.osquery?.value?.packs ?? {};
    expect(packs).toHaveProperty(packKey);
    const queries = (packs as Record<string, { queries?: Record<string, unknown> }>)[packKey]?.queries;
    expect(queries).toBeDefined();
    expect(Object.keys(queries ?? {}).length).toBeGreaterThan(0);

    await pageObjects.osqueryPackForm.setPagination50Rows();
    await pageObjects.osqueryPackForm.openPackFromList(packName);
    await pageObjects.osqueryPackForm.openEditPack();
    await page.getByRole('button', { name: /^Delete pack$/ }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText(/Successfully deleted/)).toBeVisible();
  });

  test('edits pack queries from the UI', async ({ browserAuth, page, pageObjects, apiServices }) => {
    test.setTimeout(300_000);
    await browserAuth.loginAsAdmin();

    const policiesResponse = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
    const firstPolicyId = (policiesResponse.data as { items: Array<{ policy_ids: string[] }> }).items[0]
      ?.policy_ids?.[0];
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
    await pageObjects.osqueryPackForm.fillQueryId(`new-query-${Date.now()}`);
    await pageObjects.osqueryPackForm.fillQueryInFlyoutFromMonaco('select * from uptime;');
    await pageObjects.osqueryPackForm.setQueryTimeout('601');
    await pageObjects.osqueryPackForm.saveQueryFlyout();
    await pageObjects.osqueryPackForm.updatePack();
    await expect(page.getByText(`Successfully updated "${packName}" pack`)).toBeVisible();

    await apiServices.osquery.packs.delete(packId);
  });
});
