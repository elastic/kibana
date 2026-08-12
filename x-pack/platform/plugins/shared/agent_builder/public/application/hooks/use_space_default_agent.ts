/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useAgentBuilderAgents } from './agents/use_agents';
import { useUiPrivileges } from './use_ui_privileges';
import { queryKeys } from '../query_keys';

export const useSpaceDefaultAgent = () => {
  const { spaceSettingsService } = useAgentBuilderServices();

  const query = useQuery({
    queryKey: queryKeys.spaceSettings.all,
    queryFn: () => spaceSettingsService.get(),
  });

  return {
    defaultAgentId: query.data?.default_agent_id ?? null,
    isLoading: query.isLoading,
    isFetched: query.isFetched,
    error: query.error,
  };
};

/**
 * Canonical source of truth for the "space default agent" UX rule.
 *
 * The per-space assignment is UI-only: the server never filters the agents
 * API by the assignment.
 */
export const useEffectiveSpaceDefaultAgent = () => {
  const { defaultAgentId, isFetched: settingsFetched } = useSpaceDefaultAgent();
  const { agents, isFetched: agentsFetched } = useAgentBuilderAgents();
  const { manageAgents } = useUiPrivileges();

  const isReady = settingsFetched && agentsFetched;
  const effectiveDefaultAgentId =
    isReady && defaultAgentId && agents.some((agent) => agent.id === defaultAgentId)
      ? defaultAgentId
      : null;

  return {
    effectiveDefaultAgentId,
    isReady,
    isRestricted: !!effectiveDefaultAgentId && !manageAgents,
  };
};

interface UseSetSpaceDefaultAgentOptions {
  onSuccess?: (defaultAgentId: string | null) => void;
  onError?: (err: Error) => void;
}

export const useSetSpaceDefaultAgent = ({
  onSuccess,
  onError,
}: UseSetSpaceDefaultAgentOptions = {}) => {
  const { spaceSettingsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (defaultAgentId: string | null) => spaceSettingsService.set(defaultAgentId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaceSettings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.agentProfiles.all });
      onSuccess?.(response.default_agent_id);
    },
    onError,
  });
};
