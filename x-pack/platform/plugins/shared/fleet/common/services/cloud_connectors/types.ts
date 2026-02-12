/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicyConfigRecord } from '../../types/models/package_policy';
import type { CloudProvider } from '../../types/models/cloud_connector';

/**
 * Storage mode for cloud connector credential variables
 * - 'package': Variables stored at policy.vars (package-level)
 * - 'input': Variables stored at policy.inputs[].streams[].vars (stream-level)
 */
export type CloudConnectorVarStorageMode = 'package' | 'input';

/**
 * Target location for cloud connector variables
 * Used to identify which vars container to read from or write to
 */
export type CloudConnectorVarTarget =
  | { mode: 'package' }
  | { mode: 'input'; inputIndex: number; streamIndex: number };

/**
 * Mapping of logical credential field names to their actual var keys
 * Different packages may use different var key names for the same logical field
 */
export interface CloudConnectorVarKeyMapping {
  /** Primary var key name */
  primary: string;
  /** Alternative/legacy var key names */
  aliases: string[];
  /** Whether this var contains a secret value */
  isSecret: boolean;
}

/**
 * Schema defining the credential fields for a specific cloud provider
 */
export interface CloudConnectorCredentialSchema {
  provider: CloudProvider;
  fields: Record<string, CloudConnectorVarKeyMapping>;
}

/**
 * Result of resolving the var target for a package policy
 */
export interface ResolvedVarTarget {
  target: CloudConnectorVarTarget;
  vars: PackagePolicyConfigRecord | undefined;
}

/**
 * Normalized AWS credentials extracted from package policy
 */
export interface NormalizedAwsCredentials {
  roleArn?: string;
  externalId?: string | { id: string; isSecretRef: boolean };
}

/**
 * Normalized Azure credentials extracted from package policy
 */
export interface NormalizedAzureCredentials {
  tenantId?: string | { id: string; isSecretRef: boolean };
  clientId?: string | { id: string; isSecretRef: boolean };
  azureCredentialsCloudConnectorId?: string;
}

/**
 * Normalized GCP credentials extracted from package policy (stub for future)
 */
export interface NormalizedGcpCredentials {
  projectId?: string;
  serviceAccountKey?: string | { id: string; isSecretRef: boolean };
}

/**
 * Union type for all normalized credentials
 */
export type NormalizedCloudConnectorCredentials =
  | NormalizedAwsCredentials
  | NormalizedAzureCredentials
  | NormalizedGcpCredentials;
