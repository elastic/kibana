/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface StaticKeyCredentials {
  access_key_id: string;
  secret_access_key: string;
}

/** A var value that points at a secret already stored by Fleet. */
export interface SecretRefValue {
  isSecretRef: true;
  id: string;
}

/** Credential var name → the secret ref Fleet currently stores for it. */
export type ExistingSecretRefs = ReadonlyMap<string, SecretRefValue>;

export type CredentialVarName = 'access_key_id' | 'secret_access_key' | 'session_token';

export interface ServiceDataStreamVars {
  /** Input types enabled for this data stream. */
  enabledInputs: string[];
  /**
   * Var values keyed by input type, then var name.
   * e.g. { 'aws-s3': { bucket_arn: 'arn:...' } }
   */
  varsByInput: Record<string, Record<string, string | string[]>>;
  /**
   * Selected option per stream-level var_group, keyed by input type then group name,
   * e.g. { 'aws-cloudwatch': { log_group_source: 'log_group_arn' } }. Absent → manifest default
   * (the group's first option), resolved by `resolveVarGroupSelections`.
   */
  varGroupSelectionsByInput?: Record<string, Record<string, string>>;
}

export interface ServiceVars {
  /** Data stream ids enabled for this service instance. */
  enabledDataStreams: string[];
  /**
   * Per-data-stream var values. Keys are data stream ids (e.g. 'vpcflow', 'ec2_logs').
   */
  varsByDataStream: Record<string, ServiceDataStreamVars>;
  /**
   * Data stream namespace of a duplicate's policy. Originals have none and take the global
   * namespace; a duplicate with none takes it too.
   */
  namespace?: string;
  /**
   * Whether Fleet creates a dedicated index template for the dataset, as in Fleet's form. The
   * package policy takes one value, so it is written to every service that deploys in the policy.
   * Absent means on. Stored beside the vars, so it is never sent as a package var.
   */
  createDatasetTemplates?: boolean;
}

/**
 * A row in the step-2 table. `instanceId` is the stable row identity;
 * `serviceId` is the policy-template / Fleet join key and remains unchanged.
 * Original instances keep instanceId === serviceId for backward compat with
 * session storage written by earlier builds.
 */
export interface ServiceInstance {
  instanceId: string;
  serviceId: string;
  /** Display name — defaults to service.name, "[Duplicate]"-suffixed for copies. */
  name: string;
  isDuplicate: boolean;
}
