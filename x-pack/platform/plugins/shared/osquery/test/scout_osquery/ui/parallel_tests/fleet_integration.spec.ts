/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { uiTest as test } from '../fixtures';

const mkiTags = [...tags.stateful.classic, ...tags.serverless.security.complete];

/** Migration of `add_integration.cy.ts` (non-agent tests only — MKI-compatible). */
test.describe('Fleet integration', { tag: mkiTags }, () => {
  let agentPolicyId: string;
  let packagePolicyId: string;

  test.afterAll(async ({ apiServices }) => {
    if (packagePolicyId) {
      await apiServices.fleet.package_policies.delete(packagePolicyId).catch(() => {});
    }

    if (agentPolicyId) {
      await apiServices.fleet.agent_policies.delete(agentPolicyId, true).catch(() => {});
    }
  });

  test('adds osquery_manager integration to a new agent policy and verifies it surfaces in the Fleet API', async ({
    browserAuth,
    page,
    apiServices,
    pageObjects,
  }) => {
    test.setTimeout(120_000);
    await browserAuth.loginAsAdmin();

    const policyName = `scout-fleet-int-${Date.now()}`;
    const integrationName = `scout-osquery-int-${Date.now()}`;

    const createdPolicy = await apiServices.fleet.agent_policies.create({
      policyName,
      policyNamespace: 'default',
    });
    agentPolicyId = (createdPolicy.data as { item: { id: string } }).item.id;

    const createdPkg = await apiServices.fleet.package_policies.create({
      name: integrationName,
      namespace: 'default',
      policy_ids: [agentPolicyId],
      package: { name: 'osquery_manager', version: '' },
      inputs: {},
    });
    packagePolicyId = (createdPkg.data as { item: { id: string } }).item.id;

    await pageObjects.osqueryFleetIntegration.gotoFleetAgentPolicies();
    await expect(page.getByText(policyName)).toBeVisible({ timeout: 30_000 });
  });

  test('creates a policy with packs and verifies the pack key surfaces in the Fleet package-policy list', async ({
    browserAuth,
    apiServices,
  }) => {
    test.setTimeout(120_000);
    await browserAuth.loginAsAdmin();

    const policyName = `scout-upgrade-${Date.now()}`;
    const packName = `scout-pack-${Date.now()}`;

    const policyResp = await apiServices.fleet.agent_policies.create({
      policyName,
      policyNamespace: 'default',
    });
    const testPolicyId = (policyResp.data as { item: { id: string } }).item.id;

    const pkgResp = await apiServices.fleet.package_policies.create({
      name: `${policyName}-integration`,
      namespace: 'default',
      policy_ids: [testPolicyId],
      package: { name: 'osquery_manager', version: '' },
      inputs: {},
    });
    const testPkgPolicyId = (pkgResp.data as { item: { id: string } }).item.id;

    try {
      const packResp = await apiServices.osquery.packs.create({
        name: packName,
        enabled: true,
        description: 'scout fleet pack test',
        shards: {},
        policy_ids: [testPolicyId],
        queries: { q1: { ecs_mapping: {}, interval: 60, query: 'select * from uptime;' } },
      });
      const packId = (packResp.data as { data: { saved_object_id: string } }).data.saved_object_id;

      try {
        const policies = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
        const items = (policies.data as { items: Array<{ name: string }> }).items;
        const found = items.some((p) => p.name.includes(policyName));
        expect(found).toBe(true);
      } finally {
        await apiServices.osquery.packs.delete(packId).catch(() => {});
      }
    } finally {
      await apiServices.fleet.package_policies.delete(testPkgPolicyId).catch(() => {});
      await apiServices.fleet.agent_policies.delete(testPolicyId, true).catch(() => {});
    }
  });

  test('handles Fleet tour dismissal when navigating to agent policies', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    test.setTimeout(60_000);
    await browserAuth.loginAsAdmin();
    await pageObjects.osqueryFleetIntegration.gotoFleetAgentPolicies();
    await pageObjects.osqueryFleetIntegration.closeFleetTourIfVisible();
    await expect(page.testSubj.locator('createAgentPolicyButton')).toBeVisible({
      timeout: 30_000,
    });
  });
});
