/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';

import { API_VERSIONS } from '../../../common';

import { agentlessPolicyRouteService } from '../../../common/services';
import type {
  AgentlessPolicyUpgradeDryRunResponse,
  BulkUpgradeAgentlessPoliciesResponse,
  CreateAgentlessPolicyRequest,
  CreateAgentlessPolicyResponse,
  DeleteAgentlessPolicyRequest,
  DeleteAgentlessPolicyResponse,
  GetBulkAgentlessPolicyThroughputResponse,
  GetAgentlessPolicyResponse,
  ListAgentlessPoliciesRequest,
  ListAgentlessPoliciesResponse,
  UpdateAgentlessPolicyRequest,
  UpdateAgentlessPolicyResponse,
} from '../../../common/types/rest_spec/agentless_policy';

import { sendRequestForRq } from './use_request';
import type { RequestError } from './use_request';

export const sendCreateAgentlessPolicy = (body: CreateAgentlessPolicyRequest['body']) => {
  return sendRequestForRq<CreateAgentlessPolicyResponse>({
    path: agentlessPolicyRouteService.getCreatePath(),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body: JSON.stringify(body),
  });
};

export const sendUpdateAgentlessPolicy = (
  policyId: string,
  body: UpdateAgentlessPolicyRequest['body']
) => {
  return sendRequestForRq<UpdateAgentlessPolicyResponse>({
    path: agentlessPolicyRouteService.getUpdatePath(policyId),
    method: 'put',
    version: API_VERSIONS.public.v1,
    body: JSON.stringify(body),
  });
};

export const sendDeleteAgentlessPolicy = (
  policyId: string,
  query?: DeleteAgentlessPolicyRequest['query']
) => {
  return sendRequestForRq<DeleteAgentlessPolicyResponse>({
    path: agentlessPolicyRouteService.getDeletePath(policyId),
    method: 'delete',
    version: API_VERSIONS.public.v1,
    query,
  });
};

export const sendBulkUpgradeAgentlessPolicies = (policyIds: string[]) => {
  return sendRequestForRq<BulkUpgradeAgentlessPoliciesResponse>({
    path: agentlessPolicyRouteService.getUpgradePath(),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body: JSON.stringify({ policyIds }),
  });
};

export const sendUpgradeAgentlessPoliciesDryRun = (policyIds: string[], pkgVersion?: string) => {
  return sendRequestForRq<AgentlessPolicyUpgradeDryRunResponse>({
    path: agentlessPolicyRouteService.getUpgradeDryRunPath(),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body: JSON.stringify(pkgVersion ? { policyIds, pkgVersion } : { policyIds }),
  });
};

export const useUpgradeAgentlessPoliciesDryRunQuery = (
  policyIds: string[],
  pkgVersion?: string,
  { enabled = policyIds.length > 0 }: Partial<{ enabled: boolean }> = {}
) => {
  return useQuery<AgentlessPolicyUpgradeDryRunResponse, RequestError>(
    // The ids are sorted in the key so a refetch of the source list that merely reorders items
    // doesn't register as a new query (each new key fires another dry-run POST).
    ['upgradeAgentlessPoliciesDryRun', [...policyIds].sort(), pkgVersion],
    () => sendUpgradeAgentlessPoliciesDryRun(policyIds, pkgVersion),
    {
      enabled,
      // Don't refire the dry-run POST every time the browser window regains focus: it gates a
      // user action, so freshness comes from mounting the settings tab, not from tab switching.
      // Failure retries and mount refetches keep the react-query defaults.
      refetchOnWindowFocus: false,
    }
  );
};

export const useBulkGetAgentlessPolicyThroughput = (policyIds: string[]) => {
  return useQuery<GetBulkAgentlessPolicyThroughputResponse, RequestError>(
    ['agentlessPolicyThroughput', policyIds],
    () =>
      sendRequestForRq<GetBulkAgentlessPolicyThroughputResponse>({
        path: agentlessPolicyRouteService.getBulkThroughputPath(),
        method: 'post',
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({ policyIds }),
      }),
    {
      enabled: policyIds.length > 0,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
};

export const sendGetAgentlessPolicy = (policyId: string) => {
  return sendRequestForRq<GetAgentlessPolicyResponse>({
    path: agentlessPolicyRouteService.getInfoPath(policyId),
    method: 'get',
    version: API_VERSIONS.public.v1,
  });
};

export const sendListAgentlessPolicies = (query?: ListAgentlessPoliciesRequest['query']) => {
  return sendRequestForRq<ListAgentlessPoliciesResponse>({
    path: agentlessPolicyRouteService.getListPath(),
    method: 'get',
    version: API_VERSIONS.public.v1,
    query,
  });
};
