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
  // AWS variables
  'aws.role_arn'?: PackagePolicyConfigRecordEntry | string;
  'aws.credentials.external_id'?: PackagePolicyConfigRecordEntry;
  role_arn?: PackagePolicyConfigRecordEntry | string;
  external_id?: {
    type?: string;
    value: {
      isSecretRef: true;
      id: string;
    };
    frozen?: boolean;
  };
  // Azure variables
  client_id?: PackagePolicyConfigRecordEntry;
  tenant_id?: PackagePolicyConfigRecordEntry;
}

export interface CloudConnectorSO {
  id: string;
  name: string;
  attributes: {
    cloudProvider: CloudProvider;
    vars: CloudConnectorVars;
    packagePolicyCount: number;
  };
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
