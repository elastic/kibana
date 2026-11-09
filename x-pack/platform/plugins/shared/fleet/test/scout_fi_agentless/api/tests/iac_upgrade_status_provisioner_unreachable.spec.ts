/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ENABLE_IAC_PROVISIONER_FLAG } from '../../../../common/constants';

const INTERNAL_HEADERS = {
  'elastic-api-version': '1',
  'x-elastic-internal-origin': 'kibana',
};
const PUBLIC_HEADERS = { 'elastic-api-version': '2023-10-31' };

const ROLE_ARN = 'arn:aws:iam::123456789012:role/ElasticFederatedIdentityTest';

// Fleet rejects a duplicate agent policy or connector name, so an interrupted run that left either
// behind (its id was never captured, so teardown cannot remove it) would fail every later run.
const RUN_SUFFIX = Date.now().toString(36);

/**
 * A Federated Identity saved with the static fallback template has no `iac_key`. Where the IaC
 * Provisioner is not reachable (this config set configures no provisioner URL, like an ECH
 * region where it is not deployed) nothing can render an update, so the connector must not be
 * flagged "upgrade available": the flyout shows its "CloudFormation stack upgrade available"
 * callout from that stored status.
 */
apiTest.describe(
  'Cloud connector IaC upgrade status when the IaC Provisioner is unreachable',
  { tag: tags.stateful.classic },
  () => {
    let agentPolicyId: string;
    let cloudConnectorId: string;
    let packagePolicyId: string;

    apiTest.beforeAll(async ({ apiServices, kbnClient }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { [ENABLE_IAC_PROVISIONER_FLAG]: true },
      });

      const { data: agentPolicy } = await kbnClient.request<{ item: { id: string } }>({
        method: 'POST',
        path: '/api/fleet/agent_policies',
        headers: PUBLIC_HEADERS,
        body: { name: `iac-unreachable-policy-${RUN_SUFFIX}`, namespace: 'default' },
      });
      agentPolicyId = agentPolicy.item.id;

      // No `iac_key`: this is the identity created from the static fallback template.
      const { data: connector } = await kbnClient.request<{ item: { id: string } }>({
        method: 'POST',
        path: '/api/fleet/cloud_connectors',
        headers: PUBLIC_HEADERS,
        body: {
          name: `iac-unreachable-connector-${RUN_SUFFIX}`,
          cloudProvider: 'aws',
          accountType: 'single-account',
          vars: { role_arn: { type: 'text', value: ROLE_ARN } },
        },
      });
      cloudConnectorId = connector.item.id;

      // An integration attached to the connector, so there is something to render an update for.
      const { data: packagePolicy } = await kbnClient.request<{ item: { id: string } }>({
        method: 'POST',
        path: '/api/fleet/package_policies',
        headers: PUBLIC_HEADERS,
        body: {
          name: `iac-unreachable-guardduty-${RUN_SUFFIX}`,
          namespace: 'default',
          policy_ids: [agentPolicyId],
          package: { name: 'aws', version: '8.1.0' },
          inputs: {
            // Enabled by default, and their required vars have no default.
            'securityhub-httpjson': { enabled: false },
            'inspector-httpjson': { enabled: false },
            'guardduty-aws-s3': { enabled: false },
            'guardduty-httpjson': {
              enabled: true,
              streams: {
                'aws.guardduty': {
                  enabled: true,
                  vars: { detector_id: '12abc34d567e8fa901bc2d34', aws_region: 'us-east-1' },
                },
              },
            },
          },
        },
      });
      packagePolicyId = packagePolicy.item.id;

      // The create body takes the connector only in the array form of `inputs`, so it is attached
      // by an update.
      await kbnClient.request({
        method: 'PUT',
        path: `/api/fleet/package_policies/${packagePolicyId}`,
        headers: PUBLIC_HEADERS,
        body: { cloud_connector_id: cloudConnectorId },
      });
    });

    apiTest.afterAll(async ({ apiServices, kbnClient }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { [ENABLE_IAC_PROVISIONER_FLAG]: false },
      });
      await kbnClient
        .request({
          method: 'DELETE',
          path: `/api/fleet/package_policies/${packagePolicyId}`,
          headers: PUBLIC_HEADERS,
        })
        .catch(() => {});
      await kbnClient
        .request({
          method: 'DELETE',
          path: `/api/fleet/cloud_connectors/${cloudConnectorId}?force=true`,
          headers: PUBLIC_HEADERS,
        })
        .catch(() => {});
      await kbnClient
        .request({
          method: 'POST',
          path: '/api/fleet/agent_policies/delete',
          headers: PUBLIC_HEADERS,
          body: { agentPolicyId },
        })
        .catch(() => {});
    });

    apiTest(
      'a flyout re-check of a keyless connector neither reports nor stores an upgrade',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const verification = await apiClient.post(
          `internal/fleet/cloud_connectors/${cloudConnectorId}/verify_iac_key`,
          {
            headers: { ...INTERNAL_HEADERS, 'kbn-xsrf': 'scout', ...cookieHeader },
            body: {},
            responseType: 'json',
          }
        );

        expect(verification).toHaveStatusCode(200);
        // The connector does have an integration to render, so this is the provisioner's
        // absence being detected, not an empty set.
        expect(verification.body.integrations.length).toBeGreaterThan(0);
        expect(verification.body.outcome).toBe('key_unavailable');
        expect(verification.body.matches).toBe(true);

        const connector = await apiClient.get(`api/fleet/cloud_connectors/${cloudConnectorId}`, {
          headers: { ...PUBLIC_HEADERS, ...cookieHeader },
          responseType: 'json',
        });
        expect(connector).toHaveStatusCode(200);
        expect(connector.body.item.iac_upgrade_status).not.toBe('upgrade_available');
      }
    );

    apiTest(
      'a flyout re-check clears an upgrade_available that a keyless connector was flagged with earlier',
      async ({ apiClient, kbnClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        // What a keyless connector got before the provisioner was asked: flagged without any
        // update that could run in this region, so its flyout callout would never clear.
        await kbnClient.request({
          method: 'PUT',
          path: `/api/saved_objects/fleet-cloud-connector/${cloudConnectorId}`,
          body: { attributes: { iac_upgrade_status: 'upgrade_available' } },
        });

        const verification = await apiClient.post(
          `internal/fleet/cloud_connectors/${cloudConnectorId}/verify_iac_key`,
          {
            headers: { ...INTERNAL_HEADERS, 'kbn-xsrf': 'scout', ...cookieHeader },
            body: {},
            responseType: 'json',
          }
        );

        expect(verification).toHaveStatusCode(200);
        expect(verification.body.outcome).toBe('key_unavailable');
        const connector = await apiClient.get(`api/fleet/cloud_connectors/${cloudConnectorId}`, {
          headers: { ...PUBLIC_HEADERS, ...cookieHeader },
          responseType: 'json',
        });
        expect(connector.body.item.iac_upgrade_status).toBe('up_to_date');
      }
    );

    apiTest(
      'onboarding a new integration on a keyless identity does not block the deployment',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        // What the onboarding sends when the saved identity is selected under "Existing
        // Identity" and AWS Config is the integration being added. A blocking verdict
        // (`matches: false`) disables Deploy and shows "CloudFormation stack update required".
        const verification = await apiClient.post(
          `internal/fleet/cloud_connectors/${cloudConnectorId}/verify_iac_key`,
          {
            headers: { ...INTERNAL_HEADERS, 'kbn-xsrf': 'scout', ...cookieHeader },
            body: {
              integrations: [
                {
                  name: 'aws',
                  policyTemplates: [{ name: 'config', enabledInputs: ['cel'] }],
                },
              ],
            },
            responseType: 'json',
          }
        );

        expect(verification).toHaveStatusCode(200);
        expect(verification.body.matches).toBe(true);
        expect(verification.body.reason).toBeUndefined();
        expect(verification.body.outcome).toBe('key_unavailable');
        // The set to render includes the integration being added.
        expect(
          verification.body.integrations[0].policyTemplates.map(
            (template: { name: string }) => template.name
          )
        ).toContain('config');
      }
    );
  }
);
