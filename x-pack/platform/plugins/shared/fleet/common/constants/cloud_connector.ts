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
// Renamed from supports_cloud_connectors in newer integrations (e.g. elastic/integrations#19828)
export const SUPPORTS_IDENTITY_FEDERATION_VAR_NAME = 'supports_identity_federation';

// LaunchDarkly kill switch (evaluated via `core.featureFlags`) for AWS identity federation in
// var_groups: when false, var_group options with `provider: aws` (the aws `identity_federation`
// credential_type option) are hidden from the package policy form. Default true.
// Sibling flags for azure/gcp will be added as those packages migrate to var_groups.
export const AWS_IDENTITY_FEDERATION_ENABLED_FLAG = 'fleet.awsIdentityFederationEnabled';

// OTel Verifier package constants
export const VERIFIER_PKG_NAME = 'verifier_otel';
export const VERIFIER_POLICY_TEMPLATE = 'verifierreceiver';
export const VERIFIER_INPUT_TYPE = 'otelcol';
export const VERIFIER_DATA_STREAM_TYPE = 'logs';
export const VERIFIER_DATASET = `${VERIFIER_PKG_NAME}.${VERIFIER_POLICY_TEMPLATE}`;

// Packages that should be hidden from the Identity Federation Flyout usage list.
// These are internal integrations (e.g. the permission verifier) that attach a
// cloud_connector_id but should not be surfaced to users.
export const CLOUD_CONNECTOR_HIDDEN_PACKAGES: readonly string[] = [VERIFIER_PKG_NAME];

/** Default page size for listing cloud connectors (service + HTTP API). */
export const CLOUD_CONNECTOR_LIST_DEFAULT_PER_PAGE = 20;

/**
 * Appends NOT package.name filters for {@link CLOUD_CONNECTOR_HIDDEN_PACKAGES} and
 * `latest_revision:true` to a package-policy Kuery fragment (same pattern as usage routes;
 * latest revision excludes rollback snapshot rows such as `:prev`).
 */
export function buildPackagePolicyFilterExcludingHiddenPackages(baseFilter: string): string {
  const hiddenFilter = CLOUD_CONNECTOR_HIDDEN_PACKAGES.map(
    (pkg) => `NOT ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.package.name:"${pkg}"`
  ).join(' AND ');
  const latestRevision = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.latest_revision:true`;
  if (hiddenFilter) {
    return `${baseFilter} AND ${hiddenFilter} AND ${latestRevision}`;
  }
  return `${baseFilter} AND ${latestRevision}`;
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
  SUPPORTS_IDENTITY_FEDERATION_VAR_NAME,
];

export type DefaultPolicyGroup = `${CloudProvider}_default`;
export type PolicyGroup = 'security_audit_policy_group' | DefaultPolicyGroup;

/**
 * Packages whose cloud connectors are isolated from provider-default sharing.
 * Keyed by package name: usage listings only expose the package name (not the policy
 * template), and each of these packages is isolated for all of its policy templates.
 */
export const ISOLATED_CLOUD_CONNECTOR_PACKAGES: Readonly<Record<string, PolicyGroup>> = {
  cloud_security_posture: 'security_audit_policy_group',
  cloud_asset_inventory: 'security_audit_policy_group',
};

/**
 * Returns the policy group for an integration: its isolated group if the package is
 * registered in {@link ISOLATED_CLOUD_CONNECTOR_PACKAGES}, otherwise the provider-default
 * group shared by all other integrations targeting the same cloud provider.
 * Own-property lookup so package names shadowing `Object.prototype` members
 * (e.g. `constructor`) fall through to the provider-default group.
 */
export function getPolicyGroupForIntegration(pkg: string, provider: CloudProvider): PolicyGroup {
  return Object.hasOwn(ISOLATED_CLOUD_CONNECTOR_PACKAGES, pkg)
    ? ISOLATED_CLOUD_CONNECTOR_PACKAGES[pkg]
    : `${provider}_default`;
}
