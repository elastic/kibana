/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicyConfigRecordEntry } from './package_policy';

export type CloudProvider = 'AWS' | 'Azure' | 'GCP';

export interface CloudConnectorSecretVar {
  isSecretRef: boolean;
  id: string;
}

export interface CloudConnectorVars {
  // AWS Role ARN variables
  'aws.role_arn'?: PackagePolicyConfigRecordEntry | string;
  role_arn?: PackagePolicyConfigRecordEntry | string;
  // AWS credentials variables
  'aws.credentials.external_id'?: PackagePolicyConfigRecordEntry;
  external_id?: {
    type?: string;
    value: CloudConnectorSecretVar;
    frozen?: boolean;
  };
  // Azure variables
  client_id?: PackagePolicyConfigRecordEntry;
  tenant_id?: PackagePolicyConfigRecordEntry;
}

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
  vars: Record<string, any>;
  cloudProvider: string;
}
