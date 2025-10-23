/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CloudConnector,
  AwsCloudConnectorVars,
  CloudProvider,
} from '../models/cloud_connector';

// Request interfaces
export interface CreateCloudConnectorRequest {
  name: string;
  vars: AwsCloudConnectorVars;
  cloudProvider: CloudProvider;
}

export interface UpdateCloudConnectorRequest {
  name?: string;
  vars?: AwsCloudConnectorVars;
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
