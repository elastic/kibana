/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';

import { storageKeys } from '../storage_keys';
import { getResolvedSpaceId, useActiveSpaceId } from '../context/active_space_context';
import { useEffectiveSpaceDefaultAgent } from './use_space_default_agent';

/**
 * Reads the last used agent ID for the active space directly from localStorage.
 *
 * Unlike `useLastAgentId`, this is not a hook and can be called from event
 * handlers or other imperative contexts. It cannot consult the space default
 * (which needs the agents list), so a restricted user who lands on the wrong
 * agent this way is corrected by {@link AgentRouteGuard}.
 */
export const getLastAgentId = (): string => {
  const spaceId = getResolvedSpaceId();
  const stored = localStorage.getItem(storageKeys.getAgentIdKey(spaceId));
  if (!stored) return agentBuilderDefaultAgentId;
  try {
    return JSON.parse(stored);
  } catch {
    return stored;
  }
};

/**
 * Resolves the initial agent id for the current space.
 *
 * Priority:
 * 1. The effective space-assigned default agent (when configured and reachable)
 *    — this beats localStorage so restricted users land on the assigned agent,
 *    and admins get a consistent starting point.
 * 2. Last agent used in this space (per-space localStorage entry).
 * 3. Plugin-wide default agent id.
 *
 * Callers that navigate based on the result (e.g. the root redirect) should
 * gate on {@link useLastAgentIdReady} and show a spinner until it is `true`, so
 * a restricted first-time visitor never briefly lands on the plugin-wide
 * default they can't access.
 */
export const useLastAgentId = (): string => {
  const spaceId = useActiveSpaceId();
  const [agentIdStorage] = useLocalStorage<string>(storageKeys.getAgentIdKey(spaceId));
  const { effectiveDefaultAgentId, isReady } = useEffectiveSpaceDefaultAgent();

  if (isReady && effectiveDefaultAgentId) {
    return effectiveDefaultAgentId;
  }
  return agentIdStorage ?? agentBuilderDefaultAgentId;
};

/**
 * Reports whether {@link useLastAgentId} has resolved the effective space
 * default. Callers that navigate based on the resolved id should wait for this
 * to be `true` before doing so.
 */
export const useLastAgentIdReady = (): boolean => {
  const { isReady } = useEffectiveSpaceDefaultAgent();
  return isReady;
};
