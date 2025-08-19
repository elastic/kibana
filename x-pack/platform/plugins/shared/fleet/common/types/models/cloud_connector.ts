/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicyConfigRecordEntry } from './package_policy';

export type CloudProvider = 'aws' | 'azure' | 'gcp';

export interface CloudConnectorSecretVarValue {
  isSecretRef: boolean;
  id: string;
}

export interface CloudConnectorSecretVar {
  type: 'password';
  value: CloudConnectorSecretVarValue;
  frozen?: boolean;
}

export type CloudConnectorVarsRecord = Record<
  string,
  PackagePolicyConfigRecordEntry | string | CloudConnectorSecretVar
>;

// AWS-specific cloud connector variables
export interface AwsCloudConnectorVars {
  // AWS Role ARN variables
  'aws.role_arn'?: PackagePolicyConfigRecordEntry | string;
  role_arn?: PackagePolicyConfigRecordEntry | string;
  // AWS credentials variables
  'aws.credentials.external_id'?: CloudConnectorSecretVar;
  external_id?: CloudConnectorSecretVar;
}

export type CloudConnectorVars = AwsCloudConnectorVars;

export interface CloudConnectorSO {
  id: string;
  name: string;
  cloudProvider: CloudProvider;
  vars: CloudConnectorVars;
  packagePolicyCount: number;
  created_at: string;
  updated_at: string;
}

export interface CloudConnectorListOptions {
  page?: number;
  perPage?: number;
}

export interface CreateCloudConnectorRequest {
  name: string;
  vars: CloudConnectorVars;
  cloudProvider: CloudProvider;
}
