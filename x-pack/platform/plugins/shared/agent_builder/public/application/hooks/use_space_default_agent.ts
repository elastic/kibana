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

/**
 * Reads the currently assigned default agent id (or `null` if the space is
 * unconfigured) for the active space. Returns react-query state so callers can
 * gate rendering on `isLoading` / `isFetched`.
 */
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
 * Resolves the space's *effective* default agent for the current user, and
 * whether that user is restricted to it.
 *
 * The stored assignment is only honored when the assigned agent is actually
 * present in the agents this user can see. A deleted, now-private, or otherwise
 * inaccessible assignment degrades to "unconfigured" (`null`) so a user is never
 * pinned to an unreachable agent. This client-side cross-check replaces the old
 * server read-time safety net now that the restriction is UI-only.
 *
 * `isRestricted` is `true` when the space has an effective default and the user
 * cannot manage agents: those users see only the default in the agent selector
 * and are redirected off any other agent. Admins (`manageAgents`) always see the
 * full agent list and can switch freely, while still defaulting to the space
 * agent as a consistent starting point.
 *
 * Callers that navigate based on the result should wait until `isReady` is
 * `true` (both the settings query and the agents list have settled) before
 * treating a `null` effective default as "unconfigured".
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

/**
 * Sets or clears the space's assigned default agent. On success we invalidate
 * both the settings query and the agent list so the "Space default" badge and
 * the effective-default cross-check recompute against the latest data.
 */
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
