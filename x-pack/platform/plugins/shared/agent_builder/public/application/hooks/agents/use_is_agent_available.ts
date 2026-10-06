/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { useAgentBuilderAgents } from './use_agents';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { queryKeys } from '../../query_keys';

/**
 * Returns whether `agentId` is accessible to the current user — either visible
 * in the picker list, or available as a hidden built-in agent (e.g. agents with
 * their own type that are excluded from the list by `isVisibleAgent`).
 *
 * Use this instead of `useValidateAgentId` wherever the caller needs to accept
 * a specific known agentId passed via `openChat()`, rather than only agents the
 * user can select themselves.
 */
export const useIsAgentAvailable = (
  agentId: string | undefined
): { available: boolean; isChecking: boolean } => {
  const { agents, isFetched } = useAgentBuilderAgents();
  const { agentService } = useAgentBuilderServices();

  const isInList = useMemo(
    () => (agentId ? agents.some((a) => a.id === agentId) : false),
    [agents, agentId]
  );

  // Only fetch individually when the list has loaded and the agent is not in it.
  // Built-in agents with their own type are hidden from the picker list but are
  // still accessible via the get-by-id endpoint.
  const shouldFetchDirectly = isFetched && !!agentId && !isInList;

  const { data: agentById, isFetched: isAgentByIdFetched } = useQuery({
    queryKey: queryKeys.agentProfiles.byId(agentId),
    queryFn: () => agentService.get(agentId!),
    enabled: shouldFetchDirectly,
    retry: false,
  });

  const isChecking = !isFetched || (shouldFetchDirectly && !isAgentByIdFetched);
  const available = isInList || (shouldFetchDirectly && agentById !== undefined);

  return { available, isChecking };
};
