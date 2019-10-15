/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useState, useEffect } from 'react';
import { AgentsLib } from '../../../lib/agent';
import { Agent } from '../../../../common/types/domain_data';

export function useGetAgent(agents: AgentsLib, id: string) {
  const [state, setState] = useState<{
    isLoading: boolean;
    agent: Agent | null;
    error: Error | null;
  }>({
    isLoading: false,
    agent: null,
    error: null,
  });

  const fetchAgent = async () => {
    setState({
      isLoading: true,
      agent: null,
      error: null,
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
  }, [id]);

  return {
    ...state,
    refreshAgent: fetchAgent,
  };
}
