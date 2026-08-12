/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';

/** Minimal shape of an Agent Builder agent, as needed by the feedback-agent selector. */
export interface AgentBuilderAgentOption {
  id: string;
  name: string;
}

interface ListAgentsResponse {
  results: AgentBuilderAgentOption[];
}

/**
 * Lists the Agent Builder agents (`GET /api/agent_builder/agents`) via `http` — no dependency on the
 * Agent Builder plugin. Used to populate the feedback-agent selector on the Signals panel.
 */
export const useAgentBuilderAgents = (): {
  agents: AgentBuilderAgentOption[];
  isLoading: boolean;
  error: Error | undefined;
} => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, error } = useQuery<ListAgentsResponse, Error>({
    queryKey: ['context_engine', 'agent_builder_agents'],
    queryFn: ({ signal }) => http.get<ListAgentsResponse>('/api/agent_builder/agents', { signal }),
  });

  return {
    agents: (data?.results ?? []).map(({ id, name }) => ({ id, name })),
    isLoading,
    error: error ?? undefined,
  };
};
