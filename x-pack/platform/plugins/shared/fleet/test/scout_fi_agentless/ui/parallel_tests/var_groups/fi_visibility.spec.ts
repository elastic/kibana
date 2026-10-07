/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout tests for the AWS Identity Federation (FI) var_group option filtering.
 *
 * These tests verify that `getHiddenVarGroupOptionsForPolicyTemplate` correctly
 * shows or hides credential options based on:
 *   - `hide_in_deployment_modes` on var_group options (agentless vs. default)
 *   - `hide_in_var_group_options` on inputs (per-template FI eligibility)
 *
 * AWS manifest var_groups (credential_type):
 *   - identity_federation  — hide_in_deployment_modes: [default]  → agentless only
 *   - direct_access_key    — no restrictions                       → always visible
 *   - temporary_access_key — hide_in_deployment_modes: [agentless] → agent-based only
 *   - assume_role          — hide_in_deployment_modes: [agentless] → agent-based only
 *   - shared_credentials   — hide_in_deployment_modes: [agentless] → agent-based only
 *
 * All tests mock /api/fleet/package_policies and /api/fleet/cloud_connectors to
 * prevent network calls during PR CI.
 *
 * Server config requirements (handled by fi_agentless config set):
 *   xpack.fleet.agentless.enabled: true
 *   xpack.fleet.enableExperimental: ['agentlessPoliciesAPI', 'useAgentlessAPIInUI', 'cloud_connectors']
 *   uiSettings.overrides.securitySolution:enableCloudConnector: true
 *   aws package pre-installed
 */

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

/** The EuiSelect rendered by VarGroupSelector for the `credential_type` var_group. */
const CREDENTIAL_TYPE_SELECTOR = 'varGroupSelector-credential_type';

/** The setup technology radio group (agentless vs. agent-based). */
const SETUP_TECH_SELECTOR = 'setup-technology-selector';

/** Radio button ID for the agentless setup technology option. */
const AGENTLESS_RADIO_ID = 'SetupTechnologySelector_agentless';

/** Radio button ID for the agent-based setup technology option. */
const AGENT_BASED_RADIO_ID = 'SetupTechnologySelector_agent-based';

/**
 * Role ARN field of NewCloudConnectorForm — rendered by CloudConnectorSetup when
 * identity_federation is the active var_group option (same form CSPM uses).
 */
const FI_ROLE_ARN = 'awsRoleArnInput';

/**
 * External ID field of the AWS cloud connector form. Only renders when the manifest
 * option lists an external_id var — removed from Identity Federation in #284522.
 */
const FI_EXTERNAL_ID = 'awsCloudConnectorExternalId';

// ---------------------------------------------------------------------------
// Credential option values (must match manifest var_groups[credential_type].options[].name)
// ---------------------------------------------------------------------------

const IDENTITY_FEDERATION = 'identity_federation';
const DIRECT_ACCESS_KEY = 'direct_access_key';
const TEMPORARY_ACCESS_KEY = 'temporary_access_key';
const ASSUME_ROLE = 'assume_role';
const SHARED_CREDENTIALS = 'shared_credentials';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigates to the add-integration page for a given AWS policy template.
 * URL format: /integrations/detail/aws/add-integration/<policyTemplateName>
 */
async function navigateToAddIntegration(page: ScoutPage, policyTemplateName: string) {
  await page.gotoApp(`integrations/detail/aws/add-integration/${policyTemplateName}`);
}

/**
 * If the Setup Technology selector is visible, clicks the Agentless radio button.
 * When the policy template only supports agentless the selector is absent; this
 * function is a no-op in that case.
 */
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
    // This is expected for some AWS policy templates.
  }
}

/**
 * Clicks the agent-based radio in the Setup Technology selector.
 * Unlike ensureAgentlessSelected this expects the selector to exist — templates
 * used with it must support both deployment modes.
 */
async function ensureAgentBasedSelected(page: ScoutPage) {
  const setupTechSelector = page.getByTestId(SETUP_TECH_SELECTOR);
  await setupTechSelector.waitFor({ state: 'visible', timeout: 30_000 });
  const agentBasedRadio = page.locator(`[id="${AGENT_BASED_RADIO_ID}"]`);
  if (!(await agentBasedRadio.isChecked())) {
    await agentBasedRadio.click();
  }
}

/**
 * Waits for the credential_type var_group selector to become visible.
 * This is the regression guard that tells us var_group rendering is active.
 */
async function waitForCredentialTypeSelector(page: ScoutPage) {
  await page.getByTestId(CREDENTIAL_TYPE_SELECTOR).waitFor({ state: 'visible', timeout: 30_000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe(
  'AWS var_groups — Identity Federation option visibility',
  { tag: tags.stateful.classic },
  () => {
    test.setTimeout(3 * 60 * 1000);

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test(
      'GuardDuty agentless: identity_federation is offered and shows the FI form when selected ' +
        '(regression guard for #283131)',
      async ({ page }) => {
        await mockPackagePoliciesEmpty(page);
        await mockCloudConnectorsEmpty(page);

        await navigateToAddIntegration(page, 'guardduty');
        await ensureAgentlessSelected(page);
        await waitForCredentialTypeSelector(page);

        const selector = page.getByTestId(CREDENTIAL_TYPE_SELECTOR);

        // identity_federation must be offered in agentless mode.
        // NOTE: it is not asserted as auto-selected — the initial selection is
        // computed before the deployment mode settles on agentless, so the
        // default can be direct_access_key (see #283131 discussion).
        await expect(selector.locator(`option[value="${IDENTITY_FEDERATION}"]`)).toBeAttached();

        await selector.selectOption(IDENTITY_FEDERATION);
        await expect(selector).toHaveValue(IDENTITY_FEDERATION);

        // The FI form must be visible when identity_federation is the active option
        await expect(page.getByTestId(FI_ROLE_ARN)).toBeVisible();

        // role_arn is the ONLY credential field — external_id was removed in #284522
        await expect(page.getByTestId(FI_EXTERNAL_ID)).not.toBeAttached();
      }
    );

    test(
      'GuardDuty agentless: only agentless-compatible credential options are shown ' +
        '(regression guard for hide_in_deployment_modes filtering)',
      async ({ page }) => {
        await mockPackagePoliciesEmpty(page);
        await mockCloudConnectorsEmpty(page);

        await navigateToAddIntegration(page, 'guardduty');
        await ensureAgentlessSelected(page);
        await waitForCredentialTypeSelector(page);

        const selector = page.getByTestId(CREDENTIAL_TYPE_SELECTOR);

        // Agentless-compatible options must be present
        await expect(selector.locator(`option[value="${IDENTITY_FEDERATION}"]`)).toBeAttached();
        await expect(selector.locator(`option[value="${DIRECT_ACCESS_KEY}"]`)).toBeAttached();

        // Agent-based-only options must be hidden (hide_in_deployment_modes: [agentless])
        await expect(
          selector.locator(`option[value="${TEMPORARY_ACCESS_KEY}"]`)
        ).not.toBeAttached();
        await expect(selector.locator(`option[value="${ASSUME_ROLE}"]`)).not.toBeAttached();
        await expect(selector.locator(`option[value="${SHARED_CREDENTIALS}"]`)).not.toBeAttached();
      }
    );

    test(
      'GuardDuty agentless: switching identity_federation ↔ direct_access_key toggles FI form ' +
        'both ways (regression guard for var_group selection state)',
      async ({ page }) => {
        await mockPackagePoliciesEmpty(page);
        await mockCloudConnectorsEmpty(page);

        await navigateToAddIntegration(page, 'guardduty');
        await ensureAgentlessSelected(page);
        await waitForCredentialTypeSelector(page);

        // Start state: select identity_federation, FI form is visible
        await page.getByTestId(CREDENTIAL_TYPE_SELECTOR).selectOption(IDENTITY_FEDERATION);
        await expect(page.getByTestId(CREDENTIAL_TYPE_SELECTOR)).toHaveValue(IDENTITY_FEDERATION);
        await expect(page.getByTestId(FI_ROLE_ARN)).toBeVisible();

        // Switch to direct_access_key
        await page.getByTestId(CREDENTIAL_TYPE_SELECTOR).selectOption(DIRECT_ACCESS_KEY);

        // FI form must disappear after switching away from identity_federation
        await expect(page.getByTestId(FI_ROLE_ARN)).not.toBeAttached();

        // Selector value must reflect the change
        await expect(page.getByTestId(CREDENTIAL_TYPE_SELECTOR)).toHaveValue(DIRECT_ACCESS_KEY);

        // Switch back to identity_federation — the FI form must be restored
        await page.getByTestId(CREDENTIAL_TYPE_SELECTOR).selectOption(IDENTITY_FEDERATION);
        await expect(page.getByTestId(CREDENTIAL_TYPE_SELECTOR)).toHaveValue(IDENTITY_FEDERATION);
        await expect(page.getByTestId(FI_ROLE_ARN)).toBeVisible();
      }
    );

    // -----------------------------------------------------------------------
    // Post-integrations#20527 expectations: FI was extended to all remaining
    // policy templates and every hide_in_var_group_options block was removed
    // from the aws manifest, so identity_federation appears for EVERY
    // agentless-scoped template (see kibana#283131 for the updated DoD).
    // -----------------------------------------------------------------------

    for (const template of ['config', 'inspector'] as const) {
      test(
        `${template} agentless: identity_federation appears and is selectable ` +
          '(FI extended to all templates in integrations#20527)',
        async ({ page }) => {
          await mockPackagePoliciesEmpty(page);
          await mockCloudConnectorsEmpty(page);

          await navigateToAddIntegration(page, template);
          await ensureAgentlessSelected(page);
          await waitForCredentialTypeSelector(page);

          const selector = page.getByTestId(CREDENTIAL_TYPE_SELECTOR);

          // identity_federation must be offered for this template
          await expect(selector.locator(`option[value="${IDENTITY_FEDERATION}"]`)).toBeAttached();

          // Selecting it must activate the FI form
          await selector.selectOption(IDENTITY_FEDERATION);
          await expect(selector).toHaveValue(IDENTITY_FEDERATION);
          await expect(page.getByTestId(FI_ROLE_ARN)).toBeVisible();
        }
      );
    }

    test(
      'RDS agentless: identity_federation appears and the metrics input is visible ' +
        '(aws/metrics is FI-capable since integrations#20527)',
      async ({ page }) => {
        await mockPackagePoliciesEmpty(page);
        await mockCloudConnectorsEmpty(page);

        await navigateToAddIntegration(page, 'rds');
        await ensureAgentlessSelected(page);
        await waitForCredentialTypeSelector(page);

        // identity_federation must be offered — pre-#20527 it was hidden for RDS
        await expect(
          page
            .getByTestId(CREDENTIAL_TYPE_SELECTOR)
            .locator(`option[value="${IDENTITY_FEDERATION}"]`)
        ).toBeAttached();

        // The template's aws/metrics input must be visible (title from the aws manifest)
        await expect(page.getByText('Collect RDS metrics')).toBeVisible();
      }
    );

    test(
      'S3 agentless: identity_federation appears via aws/metrics; aws-s3 input is excluded ' +
        '(aws-s3 is in AGENTLESS_DISABLED_INPUTS)',
      async ({ page }) => {
        await mockPackagePoliciesEmpty(page);
        await mockCloudConnectorsEmpty(page);

        await navigateToAddIntegration(page, 's3');
        await ensureAgentlessSelected(page);
        await waitForCredentialTypeSelector(page);

        // identity_federation must be offered (the aws/metrics input is FI-capable)
        await expect(
          page
            .getByTestId(CREDENTIAL_TYPE_SELECTOR)
            .locator(`option[value="${IDENTITY_FEDERATION}"]`)
        ).toBeAttached();

        // The aws/metrics input is visible; the aws-s3 input is excluded from agentless
        await expect(page.getByText('Collect S3 metrics')).toBeVisible();
        await expect(page.getByText('Collect S3 access logs from S3')).not.toBeVisible();
      }
    );

    test(
      'GuardDuty agent-based: identity_federation is hidden and agent-only options are shown ' +
        '(hide_in_deployment_modes: [default] on the identity_federation option)',
      async ({ page }) => {
        await mockPackagePoliciesEmpty(page);
        await mockCloudConnectorsEmpty(page);

        await navigateToAddIntegration(page, 'guardduty');
        await ensureAgentBasedSelected(page);
        await waitForCredentialTypeSelector(page);

        const selector = page.getByTestId(CREDENTIAL_TYPE_SELECTOR);

        // identity_federation is agentless-only (hide_in_deployment_modes: [default])
        await expect(selector.locator(`option[value="${IDENTITY_FEDERATION}"]`)).not.toBeAttached();

        // All agent-based credential options must be present
        await expect(selector.locator(`option[value="${DIRECT_ACCESS_KEY}"]`)).toBeAttached();
        await expect(selector.locator(`option[value="${TEMPORARY_ACCESS_KEY}"]`)).toBeAttached();
        await expect(selector.locator(`option[value="${ASSUME_ROLE}"]`)).toBeAttached();
        await expect(selector.locator(`option[value="${SHARED_CREDENTIALS}"]`)).toBeAttached();
      }
    );

    test(
      'Full AWS package agentless (no template scoping): all agentless-eligible options ' +
        'including identity_federation are offered',
      async ({ page }) => {
        await mockPackagePoliciesEmpty(page);
        await mockCloudConnectorsEmpty(page);

        // Bare add-integration route — the :integration path segment is optional
        await page.gotoApp('integrations/detail/aws/add-integration');
        await ensureAgentlessSelected(page);
        await waitForCredentialTypeSelector(page);

        const selector = page.getByTestId(CREDENTIAL_TYPE_SELECTOR);

        // Agentless-eligible options must be offered
        await expect(selector.locator(`option[value="${IDENTITY_FEDERATION}"]`)).toBeAttached();
        await expect(selector.locator(`option[value="${DIRECT_ACCESS_KEY}"]`)).toBeAttached();

        // Agent-based-only options must be hidden (hide_in_deployment_modes: [agentless])
        await expect(
          selector.locator(`option[value="${TEMPORARY_ACCESS_KEY}"]`)
        ).not.toBeAttached();
        await expect(selector.locator(`option[value="${ASSUME_ROLE}"]`)).not.toBeAttached();
        await expect(selector.locator(`option[value="${SHARED_CREDENTIALS}"]`)).not.toBeAttached();
      }
    );
  }
);
