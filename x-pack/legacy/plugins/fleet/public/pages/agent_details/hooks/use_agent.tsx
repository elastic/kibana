/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import { Agent } from '../../../../common/types/domain_data';
import { useLibs } from '../../../hooks';

export function useGetAgent(id: string) {
  const { agents } = useLibs();
  const [state, setState] = useState<{
    isLoading: boolean;
    agent: Agent | null;
    error: Error | null;
  }>({
    isLoading: false,
    agent: null,
    error: null,
  });

  const fetchAgent = async (refresh = false) => {
    setState({
      ...state,
      error: null,
      isLoading: !refresh,
    });
    try {
      const agent = await agents.get(id);
      setState({
        isLoading: false,
        agent,
        error: null,
      });
    } catch (error) {
      setState({
        isLoading: false,
        agent: null,
        error,
      });
    }
  };
  useEffect(() => {
    fetchAgent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return {
    ...state,
    refreshAgent: () => fetchAgent(true),
  };
}

export const AgentRefreshContext = React.createContext({ refresh: () => {} });

export function useAgentRefresh() {
  return React.useContext(AgentRefreshContext).refresh;
}
