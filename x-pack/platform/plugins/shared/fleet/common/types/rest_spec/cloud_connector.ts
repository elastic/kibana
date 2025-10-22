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
  cloud_connector: CreateCloudConnectorRequest;
  package_policy: Omit<NewPackagePolicy, 'policy_id' | 'policy_ids'>;
}

export interface CreateAgentPolicyWithCloudConnectorResponse {
  item: {
    agent_policy_id: string;
    cloud_connector_id: string;
    package_policy_id: string;
  };
}
