/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IacKeyCheckReason } from '../../telemetry/iac_provisioner_events';

import type {
  CloudConnector,
  CloudProvider,
  CloudConnectorVars,
  AccountType,
} from '../models/cloud_connector';

import type { RenderIacTemplateIntegration } from './iac_provisioner';

// Request interfaces
export interface CreateCloudConnectorRequest {
  name: string;
  namespace?: string;
  vars: CloudConnectorVars;
  cloudProvider: CloudProvider;
  accountType?: AccountType;
  iac_key?: string;
  iac_deployment_id?: string;
}

export interface UpdateCloudConnectorRequest {
  name?: string;
  vars?: CloudConnectorVars;
  cloudProvider?: CloudProvider;
  accountType?: AccountType;
  iac_key?: string;
  iac_deployment_id?: string;
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

export interface VerifyCloudConnectorIacKeyRequest {
  /** The integration being added (wizard). Omit to check the connector's current set (flyout). */
  integration?: RenderIacTemplateIntegration;
}

export interface VerifyCloudConnectorIacKeyResponse {
  matches: boolean;
  reason?: IacKeyCheckReason;
  /** Provider deployment identity from the connector (AWS: stack ARN); absent for legacy connectors. */
  deploymentId?: string;
  /** Parsed from deploymentId; absent when it is absent or malformed. */
  region?: string;
  /** The merged integration set that was compared — render exactly this on update. */
  integrations: RenderIacTemplateIntegration[];
}
