/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListAgentResponseItem } from '../../../../common/http_api/agents';
import { useAgentBuilderAgents } from './use_agents';
import { useAgentBuilderAgentById } from './use_agent_by_id';

interface UseResolvedAgentResult {
  agent: ListAgentResponseItem | undefined;
  isLoading: boolean;
}

/**
 * Resolves a single agent by ID. First looks in the visible agents list; if missing (e.g. the
 * agent is hidden), falls back to a direct by-ID fetch so hidden agents still display correctly
 * instead of being treated as deleted.
 */
export const useResolvedAgent = (agentId: string | undefined): UseResolvedAgentResult => {
  const { agents, isLoading } = useAgentBuilderAgents();
  const agentFromList = agentId ? agents.find((a) => a.id === agentId) : undefined;

  const { agent: agentById, isLoading: isLoadingById } = useAgentBuilderAgentById(
    !isLoading && agentId && !agentFromList ? agentId : undefined
  );

  return {
    agent: agentFromList ?? agentById ?? undefined,
    isLoading: isLoading || isLoadingById,
  };
};
