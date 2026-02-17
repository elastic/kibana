/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@kbn/es-types';

import type {
  Agent,
  AgentAction,
  ActionStatus,
  CurrentUpgrade,
  NewAgentAction,
  AgentDiagnostics,
  AgentStatus,
} from '../models';

import type { ListResult, ListWithKuery } from './common';

export interface GetAgentsRequest {
  query: ListWithKuery & {
    showAgentless?: boolean;
    showInactive?: boolean;
    showUpgradeable?: boolean;
    withMetrics?: boolean;
    searchAfter?: string;
    openPit?: boolean;
    pitId?: string;
    pitKeepAlive?: string;
  };
}

export interface GetAgentsResponse extends ListResult<Agent> {
  pit?: string;
  nextSearchAfter?: string;
  statusSummary?: Record<AgentStatus, number>;
}

export interface GetAgentTagsResponse {
  items: string[];
}

export interface GetOneAgentRequest {
  params: {
    agentId: string;
  };
  query: {
    withMetrics?: boolean;
  };
}

export interface GetOneAgentResponse {
  item: Agent;
}

export interface GetAgentUploadsResponse {
  items: AgentDiagnostics[];
}

export interface DeleteAgentUploadResponse {
  id: string;
  deleted: boolean;
}

export interface PostNewAgentActionRequest {
  body: {
    action: Omit<NewAgentAction, 'agents'>;
  };
  params: {
    agentId: string;
  };
}

export interface PostNewAgentActionResponse {
  item: AgentAction;
}

export interface PostAgentUnenrollRequest {
  params: {
    agentId: string;
  };
  body: {
    force?: boolean;
    revoke?: boolean;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PostAgentUnenrollResponse {}

export interface PostBulkAgentUnenrollRequest {
  body: {
    agents: string[] | string;
    force?: boolean;
    revoke?: boolean;
    includeInactive?: boolean;
  };
}

export interface BulkAgentAction {
  actionId: string;
}

export type PostBulkAgentUnenrollResponse = BulkAgentAction;

export interface PostAgentUpgradeRequest {
  params: {
    agentId: string;
  };
  body: {
    source_uri?: string;
    version: string;
    force?: boolean;
  };
}

export interface PostBulkAgentUpgradeRequest {
  body: {
    agents: string[] | string;
    source_uri?: string;
    version: string;
    rollout_duration_seconds?: number;
    start_time?: string;
    force?: boolean;
    includeInactive?: boolean;
  };
}

export type PostBulkAgentUpgradeResponse = BulkAgentAction;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PostAgentUpgradeResponse {}

export interface PostAgentRollbackRequest {
  params: {
    agentId: string;
  };
}

export interface PostAgentRollbackResponse {
  actionId: string;
}

export interface PostBulkAgentRollbackRequest {
  body: {
    agents: string[] | string;
    batchSize?: number;
    includeInactive?: boolean;
  };
}

export interface PostBulkAgentRollbackResponse {
  actionIds: string[];
}

export interface PostAgentReassignRequest {
  params: {
    agentId: string;
  };
  body: { policy_id: string };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PostAgentReassignResponse {}

export interface PostBulkAgentReassignRequest {
  body: {
    policy_id: string;
    agents: string[] | string;
    batchSize?: number;
    includeInactive?: boolean;
  };
}

export enum RequestDiagnosticsAdditionalMetrics {
  'CPU' = 'CPU',
}

export interface PostRequestDiagnosticsRequest {
  body: {
    additional_metrics: RequestDiagnosticsAdditionalMetrics[];
  };
}

export type PostRequestDiagnosticsResponse = BulkAgentAction;
export type PostBulkRequestDiagnosticsResponse = BulkAgentAction;

export interface PostRequestBulkDiagnosticsRequest {
  body: {
    agents: string[] | string;
    batchSize?: number;
    additional_metrics: RequestDiagnosticsAdditionalMetrics[];
  };
}

export type PostBulkAgentReassignResponse = BulkAgentAction;

export type PostBulkUpdateAgentTagsResponse = BulkAgentAction;

export interface DeleteAgentRequest {
  params: {
    agentId: string;
  };
}
export interface MigrateSingleAgentRequest {
  body: {
    id: string;
    enrollment_token: string;
    uri: string;
    settings?: {
      ca_sha256?: string;
      certificate_authorities?: string;
      elastic_agent_cert?: string;
      elastic_agent_cert_key?: string;
      elastic_agent_cert_key_passphrase?: string;
      headers?: Record<string, string>;
      insecure?: boolean;
      proxy_disabled?: boolean;
      proxy_headers?: Record<string, string>;
      proxy_url?: string;
      staging?: string;
      tags?: string;
      replace_token?: string;
    };
  };
}
export interface MigrateSingleAgentResponse {
  actionId: string;
}
export interface BulkMigrateAgentsRequest {
  body: {
    agents: string[] | string;
    enrollment_token: string;
    uri: string;
    settings?: {
      ca_sha256?: string;
      certificate_authorities?: string;
      elastic_agent_cert?: string;
      elastic_agent_cert_key?: string;
      elastic_agent_cert_key_passphrase?: string;
      headers?: Record<string, string>;
      insecure?: boolean;
      proxy_disabled?: boolean;
      proxy_headers?: Record<string, string>;
      proxy_url?: string;
      staging?: string;
      tags?: string;
    };
  };
}
export interface BulkMigrateAgentsResponse {
  actionId: string;
}
export interface UpdateAgentRequest {
  params: {
    agentId: string;
  };
  body: {
    user_provided_metadata?: Record<string, any>;
    tags?: string[];
  };
}

export interface PostBulkUpdateAgentTagsRequest {
  body: {
    agents: string[] | string;
    tagsToAdd?: string[];
    tagsToRemove?: string[];
    includeInactive?: boolean;
  };
}

export interface GetAgentStatusRequest {
  query: {
    kuery?: string;
    policyId?: string;
  };
}

export interface GetAgentStatusResponse {
  results: {
    events: number;
    online: number;
    error: number;
    offline: number;
    other: number;
    updating: number;
    inactive: number;
    unenrolled: number;
    all: number;
    active: number;
  };
}

export interface GetAgentIncomingDataRequest {
  query: {
    agentsIds: string[];
    pkgName?: string;
    pkgVersion?: string;
    previewData?: boolean;
  };
}

export interface IncomingDataList {
  [key: string]: { data: boolean };
}
export interface GetAgentIncomingDataResponse {
  items: IncomingDataList[];
  dataPreview: SearchHit[];
}

export interface GetCurrentUpgradesResponse {
  items: CurrentUpgrade[];
}

export interface GetActionStatusRequest {
  query: {
    perPage?: number;
    page?: number;
    date?: string;
    latest?: number;
  };
}
export interface GetActionStatusResponse {
  items: ActionStatus[];
}
export interface GetAvailableVersionsResponse {
  items: string[];
}

export interface PostRetrieveAgentsByActionsRequest {
  body: {
    actionIds: string[];
  };
}

export interface PostRetrieveAgentsByActionsResponse {
  items: string[];
}

export interface ChangeAgentPrivilegeLevelRequest {
  agentId: string;
  body: {
    user_info?: AgentPrivilegeLevelChangeUserInfo;
  } | null;
}

export interface ChangeAgentPrivilegeLevelResponse {
  actionId: string;
}

export interface AgentPrivilegeLevelChangeUserInfo {
  username?: string;
  groupname?: string;
  password?: string;
}

export interface BulkChangeAgentPrivilegeLevelRequest {
  body: {
    agents: string[] | string;
    user_info?: AgentPrivilegeLevelChangeUserInfo;
  };
}

export interface BulkChangeAgentPrivilegeLevelResponse {
  actionId: string;
}

export interface PostGenerateAgentsReportRequest {
  body: {
    agents: string[] | string;
    fields: string[];
    timezone?: string;
    sort?: {
      field?: string;
      direction?: 'asc' | 'desc';
    };
  };
}

export interface PostGenerateAgentsReportResponse {
  url: string;
}
