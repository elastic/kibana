/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Scout coverage for the shared create setup and the existing saved-policy edit form. */

import { expect } from '@kbn/scout/ui';
import { tags, test } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';

import {
  mockPackagePoliciesEmpty,
  mockCloudConnectorsEmpty,
} from '../../../../scout/ui/fixtures/mocks';

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const CREDENTIAL_TYPE_SELECTOR = 'varGroupSelector-credential_type';
const SETUP_TECH_SELECTOR = 'setup-technology-selector';
const AGENTLESS_RADIO_ID = 'SetupTechnologySelector_agentless';

const FI_EXTERNAL_ID = 'awsCloudConnectorExternalId';

const SAVE_BUTTON = 'createPackagePolicySaveButton';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const IDENTITY_FEDERATION = 'identity_federation';
const ROLE_ARN = 'arn:aws:iam::123456789012:role/ElasticFederatedIdentityTest';
const CONNECTOR_NAME = 'fi-e2e-test-connector';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureAgentlessSelected(page: ScoutPage) {
  const setupTechSelector = page.getByTestId(SETUP_TECH_SELECTOR);
  try {
    await setupTechSelector.waitFor({ state: 'visible', timeout: 5_000 });
    const agentlessRadio = page.locator(`[id="${AGENTLESS_RADIO_ID}"]`);
    if (!(await agentlessRadio.isChecked())) {
      await agentlessRadio.click();
    }
  } catch {
    // Selector not present — the template only supports one deployment mode.
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe(
  'AWS Federated Identity — create and saved-policy edit',
  { tag: tags.stateful.classic },
  () => {
    test.setTimeout(3 * 60 * 1000);

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('GuardDuty agentless: the shared form keeps Save blocked while attachment is pending', async ({
      page,
    }) => {
      await mockPackagePoliciesEmpty(page);
      await mockCloudConnectorsEmpty(page);

      await page.gotoApp('integrations/detail/aws/add-integration/guardduty');
      await ensureAgentlessSelected(page);
      await page.getByTestId(CREDENTIAL_TYPE_SELECTOR).selectOption(IDENTITY_FEDERATION);

      await expect(
        page.getByTestId('awsIdentityFederationSetup-launchCloudFormation')
      ).toBeVisible();
      await expect(page.getByTestId(FI_EXTERNAL_ID)).not.toBeAttached();
      await expect(page.getByTestId(SAVE_BUTTON)).toBeDisabled();
    });

    test(
      'Edit page: a saved FI policy round-trips — identity_federation selected and ' +
        'its cloud connector rendered',
      async ({ page }) => {
        const policyId = 'fi-e2e-agent-policy';
        const packagePolicyId = 'fi-e2e-package-policy';
        const connectorId = 'fi-e2e-connector-id';

        await mockPackagePoliciesEmpty(page);

        // The saved cloud connector referenced by the policy
        await page.route(/\/api\/fleet\/cloud_connectors/, async (route, request) => {
          if (request.method() === 'GET') {
            const connector = {
              id: connectorId,
              name: CONNECTOR_NAME,
              cloudProvider: 'aws',
              vars: { role_arn: { value: ROLE_ARN, type: 'text' } },
              packagePolicyCount: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            const isItemRequest = request.url().includes(connectorId);
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(
                isItemRequest ? { item: connector } : { items: [connector], total: 1 }
              ),
            });
          } else {
            await route.continue();
          }
        });

        // The referenced agent policy does not exist server-side — serve a minimal one
        await page.route(
          new RegExp(`/api/fleet/agent_policies/${policyId}`),
          async (route, request) => {
            if (request.method() === 'GET') {
              await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                  item: {
                    id: policyId,
                    name: 'FI e2e agentless policy',
                    namespace: 'default',
                    status: 'active',
                    is_managed: false,
                    is_protected: false,
                    supports_agentless: true,
                    revision: 1,
                    updated_at: new Date().toISOString(),
                    updated_by: 'test_user',
                    package_policies: [],
                  },
                }),
              });
            } else {
              await route.continue();
            }
          }
        );

        // Canned agentless FI policy served to the edit page through the
        // managed integrations API (GET /api/fleet/managed_integrations/{id})
        await page.route(
          new RegExp(`/api/fleet/managed_integrations/${packagePolicyId}`),
          async (route, request) => {
            if (request.method() === 'GET') {
              await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                  item: {
                    id: packagePolicyId,
                    name: 'aws-guardduty-fi-roundtrip',
                    namespace: 'default',
                    policy_id: policyId,
                    policy_ids: [policyId],
                    package: { name: 'aws', title: 'AWS', version: '8.1.0' },
                    var_group_selections: { credential_type: IDENTITY_FEDERATION },
                    cloud_connector_id: connectorId,
                    cloud_connector: { enabled: true, cloud_connector_id: connectorId },
                    supports_cloud_connector: true,
                    vars: {
                      role_arn: { value: ROLE_ARN, type: 'text' },
                      supports_identity_federation: { value: true, type: 'bool' },
                    },
                    inputs: [],
                    enabled: true,
                    revision: 1,
                    created_at: new Date().toISOString(),
                    created_by: 'test_user',
                    updated_at: new Date().toISOString(),
                    updated_by: 'test_user',
                  },
                }),
              });
            } else {
              await route.continue();
            }
          }
        );

        await page.gotoApp(`fleet/policies/${policyId}/edit-integration/${packagePolicyId}`, {
          params: { isAgentless: 'true' },
        });

        // The credential selector must reflect the saved selection
        await page
          .getByTestId(CREDENTIAL_TYPE_SELECTOR)
          .waitFor({ state: 'visible', timeout: 30_000 });
        await expect(page.getByTestId(CREDENTIAL_TYPE_SELECTOR)).toHaveValue(IDENTITY_FEDERATION);

        // The edit page references the connector by name (Existing Identity picker) —
        // the saved connector must be rendered; no external_id field exists (#284522)
        await expect(page.getByText(CONNECTOR_NAME)).toBeVisible();
        await expect(page.getByTestId(FI_EXTERNAL_ID)).not.toBeAttached();
      }
    );
  }
);
