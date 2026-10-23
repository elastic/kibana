/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout test for integrations that have agentless as the default deployment mode
 * (kibana#297105, elastic/integrations#21887).
 *
 * The page showed "Elastic Managed Integration" as selected, but Save created an
 * agent-based policy unless the user switched to Agent-based and back. The pinned aws
 * version has no `is_default` on any policy template, so the package info response is
 * patched in the browser to make agentless the default of the `billing` template.
 * The browser→Kibana calls that would reach the agentless controller are intercepted
 * with page.route(), like in the other specs of this suite.
 */

import { expect } from '@kbn/scout/ui';
import { tags, test } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';

import {
  mockPackagePoliciesEmpty,
  mockManagedIntegrationsCreate,
} from '../../../../scout/ui/fixtures/mocks';

const CREDENTIAL_TYPE_SELECTOR = 'varGroupSelector-credential_type';
const AGENTLESS_RADIO_ID = 'SetupTechnologySelector_agentless';
const ACCESS_KEY_ID_INPUT = 'passwordInput-access-key-id';
const SECRET_ACCESS_KEY_INPUT = 'passwordInput-secret-access-key';
const SAVE_BUTTON = 'createPackagePolicySaveButton';

const DIRECT_ACCESS_KEY = 'direct_access_key';

/** Makes agentless the default deployment mode of the aws `billing` policy template. */
async function mockAwsBillingAgentlessDefault(page: ScoutPage) {
  await page.route(/\/api\/fleet\/epm\/packages\/aws(\/[^/?]+)?(\?|$)/, async (route, request) => {
    if (request.method() !== 'GET') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const body = await response.json();
    const billing = body.item.policy_templates.find(
      (template: { name: string }) => template.name === 'billing'
    );
    if (!billing?.deployment_modes?.agentless?.enabled) {
      throw new Error('The aws billing policy template does not support agentless');
    }
    billing.deployment_modes.agentless.is_default = true;
    await route.fulfill({ response, json: body });
  });
}

test.describe('Agentless as the default deployment mode', { tag: tags.stateful.classic }, () => {
  test.setTimeout(3 * 60 * 1000);

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test(
    'AWS Billing: saves an agentless policy when the deployment mode was not changed ' +
      '(regression guard for #297105)',
    async ({ page }) => {
      let capturedPolicyBody: Record<string, unknown> | null = null;
      const agentBasedRequests: string[] = [];
      page.on('request', (request) => {
        if (
          request.method() === 'POST' &&
          /\/api\/fleet\/(agent_policies|package_policies)(\?|$)/.test(request.url())
        ) {
          agentBasedRequests.push(request.url());
        }
      });

      await mockPackagePoliciesEmpty(page);
      await mockAwsBillingAgentlessDefault(page);
      await mockManagedIntegrationsCreate(page, (body) => {
        capturedPolicyBody = body;
      });

      await page.gotoApp('integrations/detail/aws/add-integration/billing');
      await page
        .getByTestId(CREDENTIAL_TYPE_SELECTOR)
        .waitFor({ state: 'visible', timeout: 30_000 });

      // Agentless is selected by default, the deployment selector is not touched
      await expect(page.locator(`[id="${AGENTLESS_RADIO_ID}"]`)).toBeChecked();

      await page.getByTestId(CREDENTIAL_TYPE_SELECTOR).selectOption(DIRECT_ACCESS_KEY);
      await page.getByTestId(ACCESS_KEY_ID_INPUT).fill('AKIAIOSFODNN7EXAMPLE');
      await page
        .getByTestId(SECRET_ACCESS_KEY_INPUT)
        .fill('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');

      const saveButton = page.getByTestId(SAVE_BUTTON);
      await expect(saveButton).toBeEnabled({ timeout: 10_000 });
      await saveButton.click();

      // Some flows show a confirmation modal before submitting — accept it if present
      const confirmButton = page.getByTestId('confirmModalConfirmButton');
      try {
        await confirmButton.waitFor({ state: 'visible', timeout: 5_000 });
        await confirmButton.click();
      } catch {
        // No modal — the save submitted directly.
      }

      await expect
        .poll(() => capturedPolicyBody, {
          message: 'Waiting for managed integration create request',
          timeout: 30_000,
        })
        .not.toBeNull();

      const policy = capturedPolicyBody! as {
        package?: { name?: string };
        var_group_selections?: Record<string, string>;
      };
      expect(policy.package?.name).toBe('aws');
      expect(policy.var_group_selections?.credential_type).toBe(DIRECT_ACCESS_KEY);

      // No agent-based agent policy or package policy was created
      expect(agentBasedRequests).toStrictEqual([]);

      // The page keeps requesting after the save, ignore the routes still in flight
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    }
  );
});
