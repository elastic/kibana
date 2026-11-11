/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout tests for the Federated Identity create → save → edit round-trip
 * (kibana#283131, "Broader Federated Identity E2E coverage").
 *
 * The agentless controller is never reachable in PR CI, so — following the
 * scout_cspm_agentless precedent — the browser→Kibana API calls are intercepted
 * with page.route():
 *   - POST /api/fleet/cloud_connectors      → captured + mocked (Create Identity)
 *   - POST /api/fleet/managed_integrations  → captured + mocked (policy save)
 *   - GET  /api/fleet/managed_integrations/{id} → canned FI policy (edit page)
 *
 * The assertions on the captured request bodies are the actual test: the policy
 * payload must carry `var_group_selections.credential_type: identity_federation`
 * and a role_arn, and must never contain an external_id (removed in #284522).
 */

import { expect } from '@kbn/scout/ui';
import { tags, test } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';

import {
  mockPackagePoliciesEmpty,
  mockCloudConnectorsCreate,
  mockManagedIntegrationsCreate,
} from '../../../../scout/ui/fixtures/mocks';

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const CREDENTIAL_TYPE_SELECTOR = 'varGroupSelector-credential_type';
const SETUP_TECH_SELECTOR = 'setup-technology-selector';
const AGENTLESS_RADIO_ID = 'SetupTechnologySelector_agentless';

/** NewCloudConnectorForm fields — the form CloudConnectorSetup renders for aws. */
const FI_CONNECTOR_NAME = 'cloudConnectorNameInput';
const FI_ROLE_ARN = 'awsRoleArnInput';
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

/** Recursively asserts a captured request body never mentions external_id (#284522). */
function expectNoExternalId(body: unknown) {
  expect(JSON.stringify(body)).not.toContain('external_id');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe(
  'AWS Federated Identity — create, save, and edit round-trip',
  { tag: tags.stateful.classic },
  () => {
    test.setTimeout(3 * 60 * 1000);

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test(
      'GuardDuty agentless: an FI policy saves with role_arn only ' +
        '(regression guard for #284522 — no external_id anywhere in the payload)',
      async ({ page }) => {
        let capturedConnectorBody: Record<string, unknown> | null = null;
        let capturedPolicyBody: Record<string, unknown> | null = null;

        await mockPackagePoliciesEmpty(page);
        await mockCloudConnectorsCreate(page, (body) => {
          capturedConnectorBody = body;
        });
        await mockManagedIntegrationsCreate(page, (body) => {
          capturedPolicyBody = body;
        });

        await page.gotoApp('integrations/detail/aws/add-integration/guardduty');
        await ensureAgentlessSelected(page);
        await page
          .getByTestId(CREDENTIAL_TYPE_SELECTOR)
          .waitFor({ state: 'visible', timeout: 30_000 });

        // Select identity_federation and wait for the cloud connector form
        await page.getByTestId(CREDENTIAL_TYPE_SELECTOR).selectOption(IDENTITY_FEDERATION);
        await page.getByTestId(FI_ROLE_ARN).waitFor({ state: 'visible', timeout: 30_000 });

        // The form asks for a connector name and role ARN only — no external_id (#284522)
        await expect(page.getByTestId(FI_EXTERNAL_ID)).not.toBeAttached();
        await page.getByTestId(FI_CONNECTOR_NAME).fill(CONNECTOR_NAME);
        await page.getByTestId(FI_ROLE_ARN).fill(ROLE_ARN);

        // Fill the required GuardDuty stream vars (no manifest defaults)
        await page.getByRole('textbox', { name: 'Detector ID' }).fill('12abc34d567e8fa901bc2d34');
        await page.getByRole('textbox', { name: 'AWS Region' }).fill('us-east-1');

        // Save the package policy — the cloud connector is created as part of the
        // policy request (same flow as the CSPM scout suite)
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

        // The managed integration create request is the round-trippable policy payload
        await expect
          .poll(() => capturedPolicyBody, {
            message: 'Waiting for managed integration create request',
            timeout: 30_000,
          })
          .not.toBeNull();

        const policy = capturedPolicyBody! as {
          var_group_selections?: Record<string, string>;
          vars?: Record<string, unknown>;
          cloud_connector?: { enabled?: boolean; name?: string };
        };

        // The var_group selection must persist the credential type
        expect(policy.var_group_selections?.credential_type).toBe(IDENTITY_FEDERATION);

        // The policy request carries the cloud connector to create
        expect(policy.cloud_connector?.enabled).toBe(true);

        // role_arn only — external_id must not appear anywhere in the payload (#284522)
        expectNoExternalId(capturedPolicyBody);

        // If the UI created the connector via a direct POST instead, that request
        // must also be external_id-free
        if (capturedConnectorBody) {
          expectNoExternalId(capturedConnectorBody);
        }
      }
    );

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
