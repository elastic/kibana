/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import { useLibs } from '../../../hooks';

export function useGetAgentStatus(policyId: string) {
  const { policies } = useLibs();
  const [state, setState] = useState<{
    isLoading: boolean;
    result: any;
    error: Error | null;
  }>({
    isLoading: false,
    result: null,
    error: null,
  });

  const fetchAgentStatus = async (refresh = false) => {
    setState({
      ...state,
      error: null,
      isLoading: !refresh,
    });
    try {
      const status = await policies.getAgentStatus(policyId);
      setState({
        isLoading: false,
        result: status.result,
        error: null,
      });
    } catch (error) {
      setState({
        isLoading: false,
        result: null,
        error,
      });
    }
  };
  useEffect(() => {
    fetchAgentStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyId]);

  return {
    ...state,
    refreshAgentStatus: () => fetchAgentStatus(true),
  };
}

export const AgentStatusRefreshContext = React.createContext({ refresh: () => {} });

export function useAgentStatusRefresh() {
  return React.useContext(AgentStatusRefreshContext).refresh;
}
