/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudProvider } from '../types/models/cloud_connector';

import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from './package_policy';

// Backward compatibility for CSPM and Asset Discovery
export const AWS_ROLE_ARN_VAR_NAME = 'aws.role_arn';
export const AWS_CREDENTIALS_EXTERNAL_ID_VAR_NAME = 'aws.credentials.external_id';

export const ROLE_ARN_VAR_NAME = 'role_arn';
export const EXTERNAL_ID_VAR_NAME = 'external_id';

// Azure Cloud Connector constants
export const AZURE_TENANT_ID_VAR_NAME = 'azure.credentials.tenant_id';
export const AZURE_CLIENT_ID_VAR_NAME = 'azure.credentials.client_id';
export const AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID_VAR_NAME =
  'azure.credentials.azure_credentials_cloud_connector_id';

export const TENANT_ID_VAR_NAME = 'tenant_id';
export const CLIENT_ID_VAR_NAME = 'client_id';
export const AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID = 'azure_credentials_cloud_connector_id';

// GCP Cloud Connector constants
export const GCP_SERVICE_ACCOUNT_VAR_NAME = 'gcp.credentials.service_account_email';
export const GCP_AUDIENCE_VAR_NAME = 'gcp.credentials.audience';
export const GCP_CREDENTIALS_CLOUD_CONNECTOR_ID_VAR_NAME =
  'gcp.credentials.gcp_credentials_cloud_connector_id';

export const SERVICE_ACCOUNT_VAR_NAME = 'service_account';
export const AUDIENCE_VAR_NAME = 'audience';
export const GCP_CREDENTIALS_CLOUD_CONNECTOR_ID = 'gcp_credentials_cloud_connector_id';

// Cloud connector support flag
export const SUPPORTS_CLOUD_CONNECTORS_VAR_NAME = 'supports_cloud_connectors';

// OTel Verifier package constants
export const VERIFIER_PKG_NAME = 'verifier_otel';
export const VERIFIER_POLICY_TEMPLATE = 'verifierreceiver';
export const VERIFIER_INPUT_TYPE = 'otelcol';
export const VERIFIER_DATA_STREAM_TYPE = 'logs';
export const VERIFIER_DATASET = `${VERIFIER_PKG_NAME}.${VERIFIER_POLICY_TEMPLATE}`;

/**
 * Minimum verifier_otel package version that supports the parallel-array multi-target
 * shape (`policy_id[]`, `package_policy_id[]`, etc. all `multi: true`). Below this
 * version the manifest declared `multi: false` and accepted only single scalars,
 * supporting exactly one target integration per verifier deployment.
 *
 * `createVerifierPolicy` uses this gate (via `semver.gte`) to decide between the
 * parallel-array stream-var shape (>= this version) and the legacy scalar shape
 * (< this version). This makes Kibana producer code compatible with both manifest
 * eras, so releasing the new package version doesn't break existing 9.5+ clusters
 * that haven't yet picked up the parallel-array producer code.
 */
export const VERIFIER_MULTI_TARGET_MIN_VERSION = '0.1.0';

// Packages that should be hidden from the Identity Federation Flyout usage list.
// These are internal integrations (e.g. the permission verifier) that attach a
// cloud_connector_id but should not be surfaced to users.
export const CLOUD_CONNECTOR_HIDDEN_PACKAGES: readonly string[] = [VERIFIER_PKG_NAME];

/** Default page size for listing cloud connectors (service + HTTP API). */
export const CLOUD_CONNECTOR_LIST_DEFAULT_PER_PAGE = 20;

/**
 * Upper bound on the number of package policies (integrations) that can use a
 * single cloud connector. Derived from the Cloud agentless deployment limit
 * (5 concurrent agentless agent policies). Cloud connectors require agentless
 * mode, so at most 5 agent policies can host cloud-connector-using integrations
 * at one time. Assuming up to ~5 integrations per agent policy can share a
 * connector, 25 = 5 × 5 gives a comfortable ceiling. Used as:
 *   - the `perPage` cap for the SO query in `verify_permissions_task`
 *   - the `max` of the public usage endpoint's `perPage` (no client benefits
 *     from asking for more than this; the SO can't physically hold more).
 * Revisit when the agentless concurrency limit grows.
 */
export const MAX_CLOUD_CONNECTOR_PACKAGE_POLICIES = 25;

/**
 * Appends NOT package.name filters for {@link CLOUD_CONNECTOR_HIDDEN_PACKAGES} and
 * `latest_revision:true` to a package-policy Kuery fragment (same pattern as usage routes;
 * latest revision excludes rollback snapshot rows such as `:prev`).
 *
 * Built via the "collect-and-join" idiom so the resulting Kuery is well-formed
 * regardless of whether {@link baseFilter} is empty or {@link CLOUD_CONNECTOR_HIDDEN_PACKAGES}
 * is empty — neither leading nor trailing `AND` can sneak in.
 */
export function buildPackagePolicyFilterExcludingHiddenPackages(baseFilter: string): string {
  const clauses: string[] = [];
  if (baseFilter) {
    clauses.push(baseFilter);
  }
  for (const pkg of CLOUD_CONNECTOR_HIDDEN_PACKAGES) {
    clauses.push(`NOT ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.package.name:"${pkg}"`);
  }
  clauses.push(`${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.latest_revision:true`);
  return clauses.join(' AND ');
}

// Account type variable names for different cloud providers
export const AWS_ACCOUNT_TYPE_VAR_NAME = 'aws.account_type';
export const AZURE_ACCOUNT_TYPE_VAR_NAME = 'azure.account_type';
export const GCP_ACCOUNT_TYPE_VAR_NAME = 'gcp.account_type';

// Account type values used across all cloud providers
// These values are used both in package policy vars and in the Cloud Connector API
export const SINGLE_ACCOUNT = 'single-account';
export const ORGANIZATION_ACCOUNT = 'organization-account';

// Default account type for cloud connectors when not explicitly specified
export const CLOUD_CONNECTOR_DEFAULT_ACCOUNT_TYPE = SINGLE_ACCOUNT;

export const SUPPORTED_CLOUD_CONNECTOR_VARS = [
  AWS_ROLE_ARN_VAR_NAME,
  AWS_CREDENTIALS_EXTERNAL_ID_VAR_NAME,
  ROLE_ARN_VAR_NAME,
  EXTERNAL_ID_VAR_NAME,
  AZURE_TENANT_ID_VAR_NAME,
  AZURE_CLIENT_ID_VAR_NAME,
  AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID_VAR_NAME,
  TENANT_ID_VAR_NAME,
  CLIENT_ID_VAR_NAME,
  AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID,
  GCP_SERVICE_ACCOUNT_VAR_NAME,
  GCP_AUDIENCE_VAR_NAME,
  GCP_CREDENTIALS_CLOUD_CONNECTOR_ID_VAR_NAME,
  SERVICE_ACCOUNT_VAR_NAME,
  AUDIENCE_VAR_NAME,
  GCP_CREDENTIALS_CLOUD_CONNECTOR_ID,
  SUPPORTS_CLOUD_CONNECTORS_VAR_NAME,
];

// Cloud connector permission allowlist
// Defines which integrations can share cloud connectors within the same policy group.
// Connectors created by an integration in one group cannot be reused by integrations in another group.

export type PolicyGroup = 'security_audit_policy_group' | 'aws_global_policy_group';

export interface CloudConnectorAllowlistEntry {
  provider: CloudProvider;
  package: string;
  policyTemplate: string;
}

export const CLOUD_CONNECTOR_PERMISSION_ALLOWLIST: Record<
  PolicyGroup,
  ReadonlyArray<CloudConnectorAllowlistEntry>
> = {
  security_audit_policy_group: [
    { provider: 'aws', package: 'cloud_security_posture', policyTemplate: 'cspm' },
    { provider: 'aws', package: 'cloud_asset_inventory', policyTemplate: 'asset_inventory' },
  ],
  aws_global_policy_group: [
    { provider: 'aws', package: 'aws', policyTemplate: 'guardduty' },
    { provider: 'aws', package: 'aws', policyTemplate: 's3' },
  ],
};

/**
 * Returns the policy group that a given integration belongs to, or undefined if not in any group.
 *
 * The lookup matches on all three discriminating fields of {@link CloudConnectorAllowlistEntry}.
 * Omitting `provider` would let an Azure cspm policy collide with the AWS cspm entry — the
 * function's contract has to be at least as wide as the data's primary key.
 */
export function getPolicyGroupForIntegration(
  provider: CloudProvider,
  pkg: string,
  policyTemplate: string
): PolicyGroup | undefined {
  for (const [group, entries] of Object.entries(CLOUD_CONNECTOR_PERMISSION_ALLOWLIST) as Array<
    [PolicyGroup, ReadonlyArray<CloudConnectorAllowlistEntry>]
  >) {
    if (
      entries.some(
        (entry) =>
          entry.provider === provider &&
          entry.package === pkg &&
          entry.policyTemplate === policyTemplate
      )
    ) {
      return group;
    }
  }
  return undefined;
}
