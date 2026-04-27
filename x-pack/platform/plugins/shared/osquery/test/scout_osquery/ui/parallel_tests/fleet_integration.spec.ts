/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import { OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS } from '../../common/scout_parallel_ui_tags';

/** UI Fleet add flow; API pack-in-policy checks live under Scout API tests. */
test.describe('Fleet integration', { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS }, () => {
  let agentPolicyId: string | undefined;
  let packagePolicyId: string | undefined;
  const uiCreatedIntegrationNames: string[] = [];

  test.afterEach(async ({ apiServices, log }) => {
    if (packagePolicyId) {
      await apiServices.fleet.package_policies
        .delete(packagePolicyId)
        .catch((err: Error) => log.debug(`fleet.package_policies.delete failed: ${err.message}`));
      packagePolicyId = undefined;
    }

    if (agentPolicyId) {
      await apiServices.fleet.agent_policies
        .delete(agentPolicyId, true)
        .catch((err: Error) => log.debug(`fleet.agent_policies.delete failed: ${err.message}`));
      agentPolicyId = undefined;
    }

    uiCreatedIntegrationNames.length = 0;
  });

  test('adds osquery_manager integration to a policy via the Fleet integrations flyout', async ({
    browserAuth,
    page,
    kbnClient,
    pageObjects,
  }) => {
    // 3 min budget: Fleet UI + policy + integration flyouts.
    test.setTimeout(180_000);
    await browserAuth.loginAsOsqueryPowerUser();

    const policyName = `scout-ui-fleet-int-${Date.now()}`;
    const integrationName = `scout-ui-osquery-int-${Date.now()}`;

    await pageObjects.osqueryFleetIntegration.gotoFleetAgentPolicies();

    // Tour is per-Kibana session; dismiss if present (do not assert always visible).
    const gotItButton = page.getByRole('button', { name: 'Got it' });
    if (await gotItButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await pageObjects.osqueryFleetIntegration.dismissFleetTour();
    }

    await pageObjects.osqueryFleetIntegration.createAgentPolicy(policyName);

    await pageObjects.osqueryFleetIntegration.openAgentPolicy(policyName);
    await pageObjects.osqueryFleetIntegration.addOsqueryManagerIntegrationToPolicy(integrationName);
    uiCreatedIntegrationNames.push(integrationName);

    // Resolve IDs for afterEach cleanup.
    const policiesResponse = await kbnClient.request<{ items: Array<{ id: string }> }>({
      method: 'GET',
      path: '/api/fleet/agent_policies',
      query: { kuery: `ingest-agent-policies.name:"${policyName}"`, perPage: 20 },
    });
    expect(policiesResponse.data.items).toHaveLength(1);
    agentPolicyId = policiesResponse.data.items[0].id;

    const packagePoliciesResponse = await kbnClient.request<{ items: Array<{ id: string }> }>({
      method: 'GET',
      path: '/api/fleet/package_policies',
      query: { kuery: `ingest-package-policies.name:"${integrationName}"`, perPage: 20 },
    });
    expect(packagePoliciesResponse.data.items).toHaveLength(1);
    packagePolicyId = packagePoliciesResponse.data.items[0].id;
  });
});
