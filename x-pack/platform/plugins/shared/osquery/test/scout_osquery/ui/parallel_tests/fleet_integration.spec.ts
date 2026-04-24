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

/**
 * UI-only coverage of `add_integration.cy.ts`. The API-only "pack surfaces in
 * Fleet wrapper" scenario has moved to
 * `api/tests/fleet_integration_policy_packs.spec.ts` per the
 * `osquery-scout-ui-post-review-hardening` change (Workstream A).
 */
test.describe('Fleet integration', { tag: mkiTags }, () => {
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

  // Replacement UI test for the Cypress `add_integration.cy.ts` scenario —
  // exercises the add-osquery-manager-via-Fleet-UI flow end-to-end (previously
  // covered only by the API body that moved to the Scout API tree).
  test('adds osquery_manager integration to a policy via the Fleet integrations flyout', async ({
    browserAuth,
    page,
    kbnClient,
    pageObjects,
  }) => {
    // 3 min: Fleet tour dismiss + policy create flyout + integration add
    // flyout + policy detail navigation.
    test.setTimeout(180_000);
    await browserAuth.loginAsOsqueryPowerUser();

    const policyName = `scout-ui-fleet-int-${Date.now()}`;
    const integrationName = `scout-ui-osquery-int-${Date.now()}`;

    await pageObjects.osqueryFleetIntegration.gotoFleetAgentPolicies();

    // Fleet's first-visit tour ("Got it" button) shows on a fresh Kibana user
    // profile but is persisted-dismissed by Kibana once clicked. With
    // `workers: 1` every test shares the same Kibana, so whichever test is
    // first to reach Fleet dismisses the tour for the rest of the run —
    // subsequent tests must not assert it is visible. We treat dismissal as
    // opportunistic pre-interaction housekeeping with a short probe.
    const gotItButton = page.getByRole('button', { name: 'Got it' });
    if (await gotItButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await pageObjects.osqueryFleetIntegration.dismissFleetTour();
    }

    await pageObjects.osqueryFleetIntegration.createAgentPolicy(policyName);

    // The create-policy flyout closes and routes to the policy detail page;
    // from there we open the integration flyout and add osquery_manager.
    await pageObjects.osqueryFleetIntegration.openAgentPolicy(policyName);
    await pageObjects.osqueryFleetIntegration.addOsqueryManagerIntegrationToPolicy(integrationName);
    uiCreatedIntegrationNames.push(integrationName);

    // Look up the created IDs via kbnClient for afterEach cleanup. The Fleet
    // list includes the UI-created policy + integration under our unique names.
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
