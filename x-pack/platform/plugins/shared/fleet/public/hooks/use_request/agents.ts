/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@kbn/react-query';

import type {
  GetActionStatusRequest,
  GetActionStatusResponse,
  GetAgentTagsResponse,
  GetAgentUploadsResponse,
  GetOneAgentRequest,
  PostBulkRequestDiagnosticsResponse,
  PostBulkUpdateAgentTagsRequest,
  PostRequestBulkDiagnosticsRequest,
  PostRequestDiagnosticsRequest,
  PostRequestDiagnosticsResponse,
  DeleteAgentUploadResponse,
  UpdateAgentRequest,
  MigrateSingleAgentRequest,
  MigrateSingleAgentResponse,
  BulkMigrateAgentsRequest,
  BulkMigrateAgentsResponse,
  ChangeAgentPrivilegeLevelRequest,
  ChangeAgentPrivilegeLevelResponse,
  BulkChangeAgentPrivilegeLevelRequest,
  BulkChangeAgentPrivilegeLevelResponse,
  PostAgentRollbackResponse,
  PostBulkAgentRollbackRequest,
  PostBulkAgentRollbackResponse,
  PostGenerateAgentsReportRequest,
  PostGenerateAgentsReportResponse,
} from '../../../common/types';

import { API_VERSIONS } from '../../../common/constants';

import { agentRouteService } from '../../services';

import type {
  GetOneAgentResponse,
  PostAgentUnenrollRequest,
  PostBulkAgentUnenrollRequest,
  PostBulkAgentUnenrollResponse,
  PostAgentUnenrollResponse,
  PostAgentReassignRequest,
  PostAgentReassignResponse,
  PostBulkAgentReassignRequest,
  PostBulkAgentReassignResponse,
  GetAgentsRequest,
  GetAgentsResponse,
  GetAgentStatusRequest,
  GetAgentStatusResponse,
  GetAgentIncomingDataRequest,
  GetAgentIncomingDataResponse,
  PostAgentUpgradeRequest,
  PostBulkAgentUpgradeRequest,
  PostAgentUpgradeResponse,
  PostBulkAgentUpgradeResponse,
  PostNewAgentActionRequest,
  PostNewAgentActionResponse,
  GetCurrentUpgradesResponse,
  GetAvailableVersionsResponse,
  PostRetrieveAgentsByActionsRequest,
  PostRetrieveAgentsByActionsResponse,
} from '../../types';

import { useRequest, sendRequest, sendRequestForRq } from './use_request';
import type { UseRequestConfig } from './use_request';

type RequestOptions = Pick<Partial<UseRequestConfig>, 'pollIntervalMs'>;

export function useGetOneAgent(
  agentId: string,
  options?: RequestOptions & {
    query?: GetOneAgentRequest['query'];
  }
) {
  return useRequest<GetOneAgentResponse>({
    path: agentRouteService.getInfoPath(agentId),
    method: 'get',
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function useGetAgents(query: GetAgentsRequest['query'], options?: RequestOptions) {
  return useRequest<GetAgentsResponse>({
    method: 'get',
    path: agentRouteService.getListPath(),
    version: API_VERSIONS.public.v1,
    query,
    ...options,
  });
}
export function useGetAgentsQuery(
  query: GetAgentsRequest['query'],
  options: Partial<{ enabled: boolean }> = {}
) {
  return useQuery(['agents', query], () => sendGetAgents(query), {
    enabled: options.enabled,
  });
}

/**
 * @deprecated use sendGetAgentsForRq or useGetAgentsQuery instead
 */
export function sendGetAgents(query: GetAgentsRequest['query'], options?: RequestOptions) {
  return sendRequest<GetAgentsResponse>({
    method: 'get',
    path: agentRouteService.getListPath(),
    version: API_VERSIONS.public.v1,
    query,
    ...options,
  });
}

export function sendGetAgentsForRq(query: GetAgentsRequest['query'], options?: RequestOptions) {
  return sendRequestForRq<GetAgentsResponse>({
    method: 'get',
    path: agentRouteService.getListPath(),
    version: API_VERSIONS.public.v1,
    query,
    ...options,
  });
}

export function useGetAgentStatus(query: GetAgentStatusRequest['query'], options?: RequestOptions) {
  return useRequest<GetAgentStatusResponse>({
    method: 'get',
    path: agentRouteService.getStatusPath(),
    version: API_VERSIONS.public.v1,
    query,
    ...options,
  });
}
export function sendGetAgentIncomingData(query: GetAgentIncomingDataRequest['query']) {
  return sendRequest<GetAgentIncomingDataResponse>({
    method: 'get',
    path: agentRouteService.getIncomingDataPath(),
    query,
    version: API_VERSIONS.public.v1,
  });
}

export function sendGetAgentStatus(
  query: GetAgentStatusRequest['query'],
  options?: RequestOptions
) {
  return sendRequest<GetAgentStatusResponse>({
    method: 'get',
    path: agentRouteService.getStatusPath(),
    query,
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendGetAgentTagsForRq(query: GetAgentsRequest['query'], options?: RequestOptions) {
  return sendRequestForRq<GetAgentTagsResponse>({
    method: 'get',
    path: agentRouteService.getListTagsPath(),
    query,
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendPostAgentReassign(
  agentId: string,
  body: PostAgentReassignRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PostAgentReassignResponse>({
    method: 'post',
    path: agentRouteService.getReassignPath(agentId),
    body,
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendPostBulkAgentReassign(
  body: PostBulkAgentReassignRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PostBulkAgentReassignResponse>({
    method: 'post',
    path: agentRouteService.getBulkReassignPath(),
    body,
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendPostAgentUnenroll(
  agentId: string,
  body: PostAgentUnenrollRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PostAgentUnenrollResponse>({
    path: agentRouteService.getUnenrollPath(agentId),
    method: 'post',
    body,
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendPostBulkAgentUnenroll(
  body: PostBulkAgentUnenrollRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PostBulkAgentUnenrollResponse>({
    path: agentRouteService.getBulkUnenrollPath(),
    method: 'post',
    body,
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendPostAgentUpgrade(
  agentId: string,
  body: PostAgentUpgradeRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PostAgentUpgradeResponse>({
    path: agentRouteService.getUpgradePath(agentId),
    method: 'post',
    body,
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendPostRequestDiagnostics(
  agentId: string,
  body: PostRequestDiagnosticsRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PostRequestDiagnosticsResponse>({
    path: agentRouteService.getRequestDiagnosticsPath(agentId),
    method: 'post',
    body,
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendPostBulkRequestDiagnostics(
  body: PostRequestBulkDiagnosticsRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PostBulkRequestDiagnosticsResponse>({
    path: agentRouteService.getBulkRequestDiagnosticsPath(),
    method: 'post',
    body,
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendGetAgentUploads(agentId: string, options?: RequestOptions) {
  return sendRequest<GetAgentUploadsResponse>({
    path: agentRouteService.getListAgentUploads(agentId),
    method: 'get',
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendDeleteAgentUpload(fileId: string, options?: RequestOptions) {
  return sendRequest<DeleteAgentUploadResponse>({
    path: agentRouteService.getAgentFileDeletePath(fileId),
    method: 'delete',
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export const useGetAgentUploads = (agentId: string, options?: RequestOptions) => {
  return useRequest<GetAgentUploadsResponse>({
    path: agentRouteService.getListAgentUploads(agentId),
    method: 'get',
    version: API_VERSIONS.public.v1,
    ...options,
  });
};

export function sendPostAgentAction(
  agentId: string,
  body: PostNewAgentActionRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PostNewAgentActionResponse>({
    path: agentRouteService.getCreateActionPath(agentId),
    method: 'post',
    body,
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendPostBulkAgentUpgrade(
  body: PostBulkAgentUpgradeRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PostBulkAgentUpgradeResponse>({
    path: agentRouteService.getBulkUpgradePath(),
    method: 'post',
    body,
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendGetActionStatus(query: GetActionStatusRequest['query'] = {}) {
  return sendRequest<GetActionStatusResponse>({
    path: agentRouteService.getActionStatusPath(),
    method: 'get',
    version: API_VERSIONS.public.v1,
    query,
  });
}

export function sendPostCancelAction(actionId: string) {
  return sendRequest<GetCurrentUpgradesResponse>({
    path: agentRouteService.getCancelActionPath(actionId),
    method: 'post',
    version: API_VERSIONS.public.v1,
  });
}

export function sendPostRetrieveAgentsByActions(body: PostRetrieveAgentsByActionsRequest['body']) {
  return sendRequest<PostRetrieveAgentsByActionsResponse>({
    path: agentRouteService.getAgentsByActionsPath(),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body,
  });
}

export function sendPutAgentTagsUpdate(
  agentId: string,
  body: UpdateAgentRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<GetOneAgentResponse>({
    method: 'put',
    path: agentRouteService.getUpdatePath(agentId),
    body,
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendPostBulkAgentTagsUpdate(
  body: PostBulkUpdateAgentTagsRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<GetOneAgentResponse>({
    method: 'post',
    path: agentRouteService.getBulkUpdateTagsPath(),
    body,
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendGetAgentsAvailableVersions() {
  return sendRequest<GetAvailableVersionsResponse>({
    method: 'get',
    path: agentRouteService.getAvailableVersionsPath(),
    version: API_VERSIONS.public.v1,
  });
}

export function useGetAgentsAvailableVersionsQuery(options: Partial<{ enabled: boolean }> = {}) {
  return useQuery(
    ['available_versions'],
    () =>
      sendRequestForRq<GetAvailableVersionsResponse>({
        method: 'get',
        path: agentRouteService.getAvailableVersionsPath(),
        version: API_VERSIONS.public.v1,
      }),
    {
      enabled: options.enabled,
    }
  );
}

export function sendGetAgentStatusRuntimeField() {
  return sendRequestForRq<string>({
    method: 'get',
    path: '/internal/fleet/agents/status_runtime_field',
    version: API_VERSIONS.internal.v1,
  });
}

export function useGetAgentStatusRuntimeFieldQuery(options: Partial<{ enabled: boolean }> = {}) {
  return useQuery(['status_runtime_field'], () => sendGetAgentStatusRuntimeField(), {
    enabled: options.enabled,
  });
}
export function sendMigrateSingleAgent(options: MigrateSingleAgentRequest['body']) {
  return sendRequestForRq<MigrateSingleAgentResponse>({
    path: agentRouteService.postMigrateSingleAgent(options.id),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body: {
      enrollment_token: options.enrollment_token,
      uri: options.uri,
      settings: options.settings ?? {},
    },
  });
}

export function sendBulkMigrateAgents(options: BulkMigrateAgentsRequest['body']) {
  return sendRequestForRq<BulkMigrateAgentsResponse>({
    path: agentRouteService.postBulkMigrateAgents(),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body: {
      agents: options.agents,
      uri: options.uri,
      enrollment_token: options.enrollment_token,
      settings: options.settings ?? {},
    },
  });
}

export function sendChangeAgentPrivilegeLevel(request: ChangeAgentPrivilegeLevelRequest) {
  return sendRequestForRq<ChangeAgentPrivilegeLevelResponse>({
    path: agentRouteService.postChangeAgentPrivilegeLevel(request.agentId),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body: request.body,
  });
}

export function sendBulkChangeAgentPrivilegeLevel(request: BulkChangeAgentPrivilegeLevelRequest) {
  return sendRequestForRq<BulkChangeAgentPrivilegeLevelResponse>({
    path: agentRouteService.postBulkChangeAgentPrivilegeLevel(),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body: request.body,
  });
}

export function sendPostAgentRollback(agentId: string) {
  return sendRequestForRq<PostAgentRollbackResponse>({
    path: agentRouteService.postAgentRollback(agentId),
    method: 'post',
    version: API_VERSIONS.public.v1,
  });
}

export function sendPostBulkAgentRollback(body: PostBulkAgentRollbackRequest['body']) {
  return sendRequestForRq<PostBulkAgentRollbackResponse>({
    path: agentRouteService.postBulkAgentRollback(),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body,
  });
}

export function sendPostGenerateAgentsReport(body: PostGenerateAgentsReportRequest['body']) {
  return sendRequestForRq<PostGenerateAgentsReportResponse>({
    path: agentRouteService.postGenerateAgentsReport(),
    method: 'post',
    version: API_VERSIONS.internal.v1,
    body,
  });
}
