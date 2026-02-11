/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CloudConnector,
  CloudProvider,
  CloudConnectorVars,
  AccountType,
} from '../models/cloud_connector';

// Request interfaces
export interface CreateCloudConnectorRequest {
  name: string;
  vars: CloudConnectorVars;
  cloudProvider: CloudProvider;
  accountType?: AccountType;
}

export interface UpdateCloudConnectorRequest {
  name?: string;
  vars?: CloudConnectorVars;
  cloudProvider?: CloudProvider;
  accountType?: AccountType;
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

export interface CloudConnectorUsageItem {
  id: string;
  name: string;
  package?: {
    name: string;
    title: string;
    version: string;
  };
  policy_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface GetCloudConnectorUsageResponse {
  items: CloudConnectorUsageItem[];
  total: number;
  page: number;
  perPage: number;
}
