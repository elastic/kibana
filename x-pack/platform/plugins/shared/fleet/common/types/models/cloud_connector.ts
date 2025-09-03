/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export type CloudProvider = 'aws' | 'azure' | 'gcp';

export interface CloudConnectorSecretVarValue {
  isSecretRef: boolean;
  id: string;
}

export interface CloudConnectorRoleArn {
  type?: 'text';
  value: string;
}

export interface CloudConnectorSecretVar {
  type?: 'password';
  value: CloudConnectorSecretVarValue;
  frozen?: boolean;
}

export interface AwsCloudConnectorVars {
  role_arn: CloudConnectorRoleArn;
  external_id: CloudConnectorSecretVar;
}

export interface CloudConnectorVars {
  role_arn?: CloudConnectorRoleArn;
  external_id?: CloudConnectorSecretVar;
  // TODO: Add other cloud providers vars
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
  vars: CloudConnectorVars;
  cloudProvider: CloudProvider;
}
