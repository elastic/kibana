/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IacKeyCheckReason,
  IacKeyVerificationOutcome,
} from '../../telemetry/iac_provisioner_events';

import type {
  CloudConnector,
  CloudConnectorIacState,
  CloudProvider,
  CloudConnectorVars,
  AccountType,
} from '../models/cloud_connector';

import type { RenderIacTemplateIntegration } from './iac_provisioner';

// Request interfaces
export interface CreateCloudConnectorRequest extends CloudConnectorIacState {
  name: string;
  namespace?: string;
  vars: CloudConnectorVars;
  cloudProvider: CloudProvider;
  accountType?: AccountType;
}

export interface UpdateCloudConnectorRequest extends CloudConnectorIacState {
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

export interface VerifyCloudConnectorIacKeyRequest {
  /** Integrations being added (onboarding). Omit or send empty to check the connector's current set only (flyout). */
  integrations?: RenderIacTemplateIntegration[];
  /**
   * Default true. False returns the connector's integration set with outcome `not_checked` and
   * no IaCP comparison, so a surface that only needs the set to render from (the flyout on open)
   * does not trigger a render or a status write.
   */
  compare?: boolean;
}

export interface VerifyCloudConnectorIacKeyResponse {
  /** False only when the deployed template must be updated; true also covers "could not check" (fail open). */
  matches: boolean;
  reason?: IacKeyCheckReason;
  /** The full verdict, so callers can tell a definite match from a check that could not run. */
  outcome: IacKeyVerificationOutcome;
  /** Provider deployment identity from the connector (AWS: stack ARN); absent for legacy connectors. */
  deploymentId?: string;
  /** Parsed from deploymentId; absent when it is absent or malformed. */
  region?: string;
  /** The merged integration set that was compared — render exactly this on update. */
  integrations: RenderIacTemplateIntegration[];
}
