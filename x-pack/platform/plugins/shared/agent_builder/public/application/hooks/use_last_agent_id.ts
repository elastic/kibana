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
import { useValidateAgentId } from './agents/use_validate_agent_id';

/**
 * Reads the last used agent ID for the active space directly from localStorage.
 * Unlike useLastAgentId, this is not a hook and can be called conditionally
 * or inside callbacks to get the current value at call time.
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

/* Canonical resolver for the agent id used to start a new conversation. */
export const useLastAgentId = (): { agentId: string; isReady: boolean } => {
  const spaceId = useActiveSpaceId();
  const [agentIdStorage] = useLocalStorage<string>(storageKeys.getAgentIdKey(spaceId));
  const { effectiveDefaultAgentId, isReady, isRestricted } = useEffectiveSpaceDefaultAgent();
  const validateAgentId = useValidateAgentId();

  let agentId: string;
  if (isReady) {
    if (isRestricted && effectiveDefaultAgentId) {
      agentId = effectiveDefaultAgentId;
    } else if (validateAgentId(agentIdStorage)) {
      agentId = agentIdStorage;
    } else {
      agentId = effectiveDefaultAgentId ?? agentBuilderDefaultAgentId;
    }
  } else {
    agentId = agentIdStorage ?? agentBuilderDefaultAgentId;
  }

  return { agentId, isReady };
};
