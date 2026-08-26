/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';

/** Agent Builder agent option for the feedback-agent selector. */
export interface AgentBuilderAgentOption {
  id: string;
  name: string;
}

interface ListAgentsResponse {
  results: AgentBuilderAgentOption[];
}

/** Lists Agent Builder agents for the feedback-agent selector. */
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
