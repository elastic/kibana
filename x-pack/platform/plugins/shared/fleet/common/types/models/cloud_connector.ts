/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type CloudProvider = 'AWS' | 'Azure' | 'GCP';

export interface CloudConnectorSecretVar {
  isSecretRef: boolean;
  id: string;
}

export interface CloudConnectorVars {
  // AWS variables
  role_arn?: {
    type?: string;
    value: string;
    frozen?: boolean;
  };
  external_id?: {
    type?: string;
    value: {
      isSecretRef: true;
      id: string;
    } | string;
    frozen?: boolean;
  };
  // Azure variables
  client_id?: {
    type?: string;
    value: string;
    frozen?: boolean;
  };
  tenant_id?: {
    type?: string;
    value: string;
    frozen?: boolean;
  };
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