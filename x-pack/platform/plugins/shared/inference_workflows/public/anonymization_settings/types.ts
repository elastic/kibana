/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ManagedWorkflowStatus =
  | 'intact'
  | 'disabled'
  | 'drifted'
  | 'not_managed'
  | 'missing'
  | 'invalid';

export type FailureMode = 'block' | 'allow_unsafe';

export interface BuiltInRule {
  entityClass: 'EMAIL' | 'IP' | 'HOST_NAME' | 'USER_NAME';
  enabled: boolean;
}

export interface CustomRule {
  id: string;
  name: string;
  entityClass: string;
  pattern: string;
  enabled: boolean;
}

export interface AnonymizationSettings {
  managementState: ManagedWorkflowStatus;
  enabled: boolean;
  builtInRules: BuiltInRule[];
  customRules: CustomRule[];
  /** Per-space override; undefined means inherit baseFailureMode. */
  failureMode?: FailureMode;
  /** Cluster-level kibana.yml default. */
  baseFailureMode: FailureMode;
}
