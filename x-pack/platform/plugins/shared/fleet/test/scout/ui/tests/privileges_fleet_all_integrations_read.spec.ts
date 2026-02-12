/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';
import { getFleetAllIntegrationsReadRole } from '../fixtures/services/privileges';

test.describe(
  'When the user has All privilege for Fleet but Read for integrations',
  { tag: ['@ess'] },
  () => {
    const agentPolicyName = 'Test Agent Policy';
    let policyId: string;

    test.beforeAll(async ({ apiServices }) => {
      // Create an agent policy via API
      const response = await apiServices.fleet.agent_policies.create({
        policyName: agentPolicyName,
        policyNamespace: 'default',
        sysMonitoring: true,
        params: {
          monitoring_enabled: ['logs', 'metrics'],
        },
      });
      policyId = response.data.item.id;
    });

    test.afterAll(async ({ apiServices }) => {
      // Cleanup: delete pre-created agent policy
      const response = await apiServices.fleet.agent_policies.delete(policyId);
      expect(response.status).toBe(200);
    });

    test('Some elements in the Fleet UI are not enabled', async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(getFleetAllIntegrationsReadRole());
      const { fleetHome } = pageObjects;

      await fleetHome.navigateTo();
      await fleetHome.waitForPageToLoad();
      await fleetHome.navigateToAgentPoliciesTab();

      // Click on the agent policy name link
      await fleetHome.getAgentPolicyNameLink(agentPolicyName).click();

      // Verify Add Package Policy button is disabled
      await expect(fleetHome.getAddPackagePolicyButton()).toBeDisabled();

      // Click on the system-1 package policy link
      await fleetHome.getPackagePolicyLink('system-1').click();

      // Verify Save Integration button is disabled
      await expect(fleetHome.getSaveIntegrationButton()).toBeDisabled();
    });

    test('Integrations are visible but cannot be added', async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(getFleetAllIntegrationsReadRole());
      const { integrationHome } = pageObjects;

      await integrationHome.navigateTo();
      await integrationHome.waitForPageToLoad();

      // Scroll to and click the Apache integration
      await integrationHome.scrollToIntegration('apache');
      await integrationHome.clickIntegrationCard('apache');

      // Verify the Add Integration button is disabled
      await expect(integrationHome.getAddIntegrationPolicyButton()).toBeDisabled();
    });
  }
);
