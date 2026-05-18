/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NewPackagePolicy,
  PackagePolicyConfigRecord,
  PackagePolicyConfigRecordEntry,
} from './package_policy';
export type CloudProvider = 'aws' | 'azure' | 'gcp';

const CLOUD_PROVIDERS: readonly CloudProvider[] = ['aws', 'azure', 'gcp'];

/**
 * Type guard to check if a value is a valid CloudProvider.
 */
export const isCloudProvider = (value: unknown): value is CloudProvider =>
  typeof value === 'string' && CLOUD_PROVIDERS.includes(value as CloudProvider);

export type AccountType = 'single-account' | 'organization-account';

export interface CloudConnectorSecretReference {
  isSecretRef: boolean;
  id: string;
}

export function isCloudConnectorSecretReference(
  value: string | CloudConnectorSecretReference | undefined
): value is CloudConnectorSecretReference {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isSecretRef' in value &&
    typeof (value as CloudConnectorSecretReference).id === 'string'
  );
}

export interface CloudConnectorVar {
  type?: 'text';
  value: string;
}

export interface CloudConnectorSecretVar {
  // Password is a special type that indicates showing a secret reference on Fleet UI.
  // Secret references are stored in the .fleet-secrets index but Cloud Connector stores the secret reference instead of the secret data.
  type?: 'password';
  value: CloudConnectorSecretReference;
  frozen?: boolean;
}

/** Used only in create/update requests: plaintext value the server will convert to a Fleet secret. */
export interface CloudConnectorNewSecretVar {
  type: 'password';
  value: string;
}

export interface AwsCloudConnectorVars {
  role_arn: CloudConnectorVar;
  external_id: CloudConnectorSecretVar | CloudConnectorNewSecretVar;
}

export interface AzureCloudConnectorVars {
  tenant_id: CloudConnectorSecretVar;
  client_id: CloudConnectorSecretVar;
  azure_credentials_cloud_connector_id: CloudConnectorVar;
}

export interface GcpCloudConnectorVars {
  service_account: CloudConnectorVar;
  audience: CloudConnectorVar;
  gcp_credentials_cloud_connector_id: CloudConnectorSecretVar;
}

export type CloudConnectorVars =
  | AwsCloudConnectorVars
  | AzureCloudConnectorVars
  | GcpCloudConnectorVars;

export type VerificationStatus = 'pending' | 'success' | 'failed';

/**
 * Per-permission status used in `PackagePolicyPermissionSummary.permissions[]`.
 * Mapping from the OTel verifier's raw `permission.status`:
 *   - `granted`                          → `verified`
 *   - `denied` + `permission.required=true`  → `denied`
 *   - `denied` + `permission.required=false` → `skipped`
 *   - `error`                            → `error`
 *   - missing from log but expected      → `required` (derived, not emitted by receiver)
 */
export type PermissionStatus = 'verified' | 'required' | 'denied' | 'error' | 'skipped';

/** A single permission's verification result, sourced from one verifier log entry. */
export interface PermissionResult {
  action: string;
  status: PermissionStatus;
  required: boolean;
  error_code?: string;
  /**
   * Human-readable summary from the verifier log's `body.text` field, e.g.
   * `"Permission check: aws/arn:aws:iam::aws:policy/SecurityAudit - error"`.
   * Surfaced in the row-expand "Message" column.
   */
  message?: string;
}

/**
 * Latest verification result for one (cloud connector, target package policy) pair.
 * Populated by `fleet:otel_permission_verifier_status_change`. Counts and roll-up
 * status are computed on the frontend from `permissions[]`; backend stores flat data.
 *
 * Descriptive fields (display name, package title, version) are intentionally NOT
 * stored here — the UI resolves them live from the package policy SO at render time,
 * which keeps the summary tight and avoids stale snapshots when packages upgrade.
 */
export interface PackagePolicyPermissionSummary {
  package_policy_id: string;
  policy_id: string;
  policy_template: string;
  package_name: string;
  last_verified_at: string;
  permissions: PermissionResult[];
}

export interface CloudConnector {
  id: string;
  name: string;
  cloudProvider: CloudProvider;
  accountType?: AccountType;
  vars: CloudConnectorVars;
  packagePolicyCount?: number;
  created_at: string;
  updated_at: string;
  namespace?: string;
  verification_status?: VerificationStatus;
  verification_started_at?: string;
  verification_failed_at?: string;
  /**
   * Latest per-target-package-policy verification results, written by
   * `fleet:otel_permission_verifier_status_change`. UI-read only; mapped as
   * `flattened` on the SO and never queried backend-side.
   */
  verification_permissions?: PackagePolicyPermissionSummary[];
}

export interface CloudConnectorListOptions {
  page?: number;
  perPage?: number;
  kuery?: string;
  fields?: string[];
}

/**
 * A package policy that belongs to a cloud connector.
 * Narrows cloud_connector_id and cloud_connector_name to required non-null strings.
 */
export interface CloudConnectorPackagePolicy extends NewPackagePolicy {
  cloud_connector_id: string;
  cloud_connector_name: string;
  supports_cloud_connector: true;
  supports_agentless: true;
}

/**
 * One target integration that the verifier should check, fully resolved.
 * Index `i` of every parallel-array stream var corresponds to entry `i` here.
 */
export interface VerifiedPackagePolicy {
  /** The target package policy's id. */
  package_policy_id: string;
  /** The first agent policy id this target package policy is assigned to. */
  policy_id: string;
  /** Human-readable name of the agent policy referenced by `policy_id`. */
  policy_name: string;
  /** The target's policy template (e.g. `cloudtrail`, `guardduty`). */
  policy_template: string;
  /** The target's integration package name (e.g. `aws`). */
  package_name: string;
  /** The target's integration package title (e.g. `AWS`). */
  package_title: string;
  /** The target's integration package version (e.g. `2.17.0`). */
  package_version: string;
}

/**
 * Typed stream vars for the verifier_otel package, matching the manifest.
 * Extends PackagePolicyConfigRecord so it can be used directly as stream vars.
 *
 * `multi: true` vars hold `string[]` values aligned by index with each other —
 * see `VerifiedPackagePolicy`. `multi: false` vars hold scalar `string` values shared
 * across all targets in the deployment.
 *
 * All `required: true` vars in the manifest are documented in VERIFIER_REQUIRED_VARS.
 */
export type VerifierStreamVars = PackagePolicyConfigRecord & {
  'data_stream.dataset': PackagePolicyConfigRecordEntry;
  identity_federation_id: PackagePolicyConfigRecordEntry;
  verification_id: PackagePolicyConfigRecordEntry;
  verification_type: PackagePolicyConfigRecordEntry;
  provider: PackagePolicyConfigRecordEntry;
  // Parallel `multi: true` arrays — index i describes target integration i.
  policy_id: PackagePolicyConfigRecordEntry;
  policy_name: PackagePolicyConfigRecordEntry;
  policy_templates: PackagePolicyConfigRecordEntry;
  package_policy_id: PackagePolicyConfigRecordEntry;
  package_name: PackagePolicyConfigRecordEntry;
  package_title: PackagePolicyConfigRecordEntry;
  package_version: PackagePolicyConfigRecordEntry;
};

/**
 * Required manifest var names for the verifier_otel package.
 * If any of these are missing the verifier OTel collector will fail to start.
 */
export const VERIFIER_REQUIRED_VARS: readonly string[] = [
  'identity_federation_id',
  'verification_id',
  'provider',
  'policy_id',
  'policy_templates',
  'package_name',
] as const;
