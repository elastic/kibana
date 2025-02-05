/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { API_VERSIONS } from '../../../../../../../common/constants';

import type { UseRequestConfig } from '../../../../hooks';
import { useRequest } from '../../../../hooks';
import type { GetAgentStatusResponse } from '../../../../types';
import { agentRouteService } from '../../../../services';

type RequestOptions = Pick<Partial<UseRequestConfig>, 'pollIntervalMs'>;

export function useGetAgentStatus(policyId?: string, options?: RequestOptions) {
  const agentStatusRequest = useRequest<GetAgentStatusResponse>({
    path: agentRouteService.getStatusPath(),
    query: {
      policyId,
    },
    method: 'get',
    version: API_VERSIONS.public.v1,
    ...options,
  });

  return {
    isLoading: agentStatusRequest.isLoading,
    data: agentStatusRequest.data,
    error: agentStatusRequest.error,
    refreshAgentStatus: () => agentStatusRequest.resendRequest,
  };
}

export const AgentStatusRefreshContext = React.createContext({ refresh: () => {} });

export function useAgentStatusRefresh() {
  return React.useContext(AgentStatusRefreshContext).refresh;
}
