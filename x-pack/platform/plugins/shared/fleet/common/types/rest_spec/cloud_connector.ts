/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudConnector, CloudConnectorVars, CloudProvider } from '../models/cloud_connector';
import type { NewPackagePolicy } from '../models/package_policy';
import type { NewAgentPolicy } from '../models/agent_policy';

// Request interfaces
export interface CreateCloudConnectorRequest {
  name: string;
  vars: CloudConnectorVars;
  cloudProvider: CloudProvider;
}

// Request format with raw secret strings (before conversion to secret references)
export interface CreateCloudConnectorRequestWithSecrets {
  name: string;
  vars: {
    // AWS
    role_arn?: { type?: 'text'; value: string };
    external_id?: { type?: 'password'; value: string; frozen?: boolean };
    // Azure
    tenant_id?: { type?: 'password'; value: string; frozen?: boolean };
    client_id?: { type?: 'password'; value: string; frozen?: boolean };
    azure_credentials_cloud_connector_id?: { type?: 'text'; value: string };
  };
  cloudProvider: CloudProvider;
}

// Type helper to represent the transformation from raw secrets to secret references
export type CreateCloudConnectorWithProcessedSecrets = Omit<
  CreateCloudConnectorRequestWithSecrets,
  'vars'
> & {
  vars: CloudConnectorVars;
};

export interface UpdateCloudConnectorRequest {
  name?: string;
  vars?: CloudConnectorVars;
  packagePolicyCount?: number;
  cloudProvider?: CloudProvider;
}

// Response interfaces following Fleet conventions
export interface GetCloudConnectorsResponse {
  items: CloudConnector[];
}

export interface GetOneCloudConnectorResponse {
  item: CloudConnector;
}

export interface CreateCloudConnectorResponse {
  item: CloudConnector;
}

export interface UpdateCloudConnectorResponse {
  item: CloudConnector;
}

export interface DeleteCloudConnectorResponse {
  id: string;
}

// Internal API: Create Agent Policy with Cloud Connector and Package Policy
export interface CreateAgentPolicyWithCloudConnectorRequest extends NewAgentPolicy {
  cloud_connector: CreateCloudConnectorRequestWithSecrets;
  package_policy: Omit<NewPackagePolicy, 'policy_id' | 'policy_ids'>;
}

export interface CreateAgentPolicyWithCloudConnectorResponse {
  item: {
    agent_policy_id: string;
    cloud_connector_id: string;
    package_policy_id: string;
  };
}
