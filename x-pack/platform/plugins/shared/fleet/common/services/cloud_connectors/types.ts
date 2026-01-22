/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudProvider } from '../../types/models/cloud_connector';
import type { PackagePolicyConfigRecord } from '../../types/models/package_policy';

/**
 * Indicates where Cloud Connector vars are stored.
 * - 'package': Credentials stored in `policy.vars` (driven by `PackageInfo.var_groups`)
 * - 'input': Credentials stored in `policy.inputs[].streams[].vars`
 */
export type CloudConnectorVarStorageMode = 'package' | 'input';

/**
 * Target location for reading/writing Cloud Connector vars.
 * - Package mode: targets `policy.vars`
 * - Input mode: targets a specific stream's vars within an input
 */
export type CloudConnectorVarTarget =
  | { mode: 'package' }
  | { mode: 'input'; inputIndex: number; streamIndex: number };

/**
 * Defines the credential var keys for a specific Cloud Connector provider.
 * Includes both the logical field names and the actual var keys used in package policies.
 */
export interface CloudConnectorCredentialVarKey {
  /** The logical name of the credential field (e.g., 'role_arn', 'tenant_id') */
  logicalName: string;
  /** The actual var key as declared in the package (e.g., 'role_arn', 'aws.role_arn') */
  varKey: string;
  /** Alternative var keys that may be used (for backward compatibility) */
  alternativeKeys?: string[];
  /** Whether this var contains a secret value */
  isSecret: boolean;
  /** The type of the var ('text' or 'password') */
  varType: 'text' | 'password';
}

/**
 * Schema for Cloud Connector credentials derived from PackageInfo.
 * Provides the mapping between logical credential fields and actual var keys.
 */
export interface CloudConnectorCredentialSchema {
  /** The cloud provider this schema applies to */
  provider: CloudProvider;
  /** The credential var keys for this provider */
  varKeys: CloudConnectorCredentialVarKey[];
}

/**
 * Result of resolving the Cloud Connector var target in a package policy.
 */
export interface CloudConnectorVarTargetResult {
  /** The storage mode (package or input) */
  mode: CloudConnectorVarStorageMode;
  /** The target location for vars */
  target: CloudConnectorVarTarget;
  /** The vars container at the target location */
  vars: PackagePolicyConfigRecord | undefined;
}

/**
 * Errors that can occur during Cloud Connector var operations.
 */
export class CloudConnectorVarAccessorError extends Error {
  constructor(message: string, public readonly code: CloudConnectorVarAccessorErrorCode) {
    super(message);
    this.name = 'CloudConnectorVarAccessorError';
  }
}

export enum CloudConnectorVarAccessorErrorCode {
  /** No enabled inputs found in the package policy */
  NO_ENABLED_INPUTS = 'NO_ENABLED_INPUTS',
  /** Multiple enabled inputs found (only one is allowed for input-level Cloud Connectors) */
  MULTIPLE_ENABLED_INPUTS = 'MULTIPLE_ENABLED_INPUTS',
  /** No enabled streams found in the enabled input */
  NO_ENABLED_STREAMS = 'NO_ENABLED_STREAMS',
  /** Multiple enabled streams found (only one is allowed for input-level Cloud Connectors) */
  MULTIPLE_ENABLED_STREAMS = 'MULTIPLE_ENABLED_STREAMS',
  /** No vars found at the target location */
  NO_VARS_FOUND = 'NO_VARS_FOUND',
  /** Required credential var is missing */
  MISSING_REQUIRED_VAR = 'MISSING_REQUIRED_VAR',
  /** Provider not supported */
  UNSUPPORTED_PROVIDER = 'UNSUPPORTED_PROVIDER',
}

/**
 * Read result for Cloud Connector credentials.
 */
export interface CloudConnectorCredentialsReadResult {
  /** The raw vars from the package policy */
  vars: PackagePolicyConfigRecord;
  /** Whether the credentials are complete (all required vars present) */
  isComplete: boolean;
  /** List of missing var keys (if incomplete) */
  missingVarKeys: string[];
}

/**
 * Options for creating a Cloud Connector var accessor.
 */
export interface CloudConnectorVarAccessorOptions {
  /** The cloud provider (aws, azure, gcp) */
  provider: CloudProvider;
  /** Optional: Force a specific storage mode (useful for testing or specific integrations) */
  forcedMode?: CloudConnectorVarStorageMode;
}
