/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { uiTest as test } from '../fixtures';

const localTags = ['@local-stateful-classic', '@local-serverless-security_complete'];

test.describe('Pack agent-triggered results', { tag: localTags }, () => {
  test('shows pack query results after scheduled agent execution', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
  }) => {
    test.setTimeout(420_000);

    await browserAuth.loginAsAdmin();

    const policiesResponse = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
    const firstPolicyId = (policiesResponse.data as { items: Array<{ policy_ids: string[] }> }).items[0]
      ?.policy_ids?.[0];
    expect(firstPolicyId).toBeDefined();

    const packName = `scout-fast-pack-${Date.now()}`;
    const created = await apiServices.osquery.packs.create({
      name: packName,
      enabled: true,
      description: 'scout',
      shards: {},
      policy_ids: [firstPolicyId!],
      queries: {
        fastQuery: { ecs_mapping: {}, interval: 10, query: 'select * from uptime;' },
      },
    });
    const packId = (created.data as { data: { saved_object_id: string } }).data.saved_object_id;

    await pageObjects.osqueryPackForm.navigateToPacksList();
    await pageObjects.osqueryPackForm.setPagination50Rows();
    await page.getByRole('link', { name: packName }).click();
    await pageObjects.osqueryPackForm.waitForPackDetailsHeading(packName);
    await pageObjects.osqueryPackForm.waitForDocsLoadingGone();

    await expect(page.testSubj.locator('last-results-date')).toBeVisible({ timeout: 360_000 });
    await expect(page.testSubj.locator('docs-count-badge')).toContainText('1', { timeout: 360_000 });

    await apiServices.osquery.packs.delete(packId);
  });
});
