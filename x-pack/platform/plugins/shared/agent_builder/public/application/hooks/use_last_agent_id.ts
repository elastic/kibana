/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';

import { storageKeys } from '../storage_keys';

/**
 * Reads the last used agent ID directly from localStorage.
 * Unlike useLastAgentId, this is not a hook and can be called conditionally
 * or inside callbacks to get the current value at call time.
 */
export const getLastAgentId = (): string => {
  const stored = localStorage.getItem(storageKeys.agentId);
  if (!stored) return agentBuilderDefaultAgentId;
  try {
    return JSON.parse(stored);
  } catch {
    return stored;
  }
};

export const useLastAgentId = (): string => {
  const [agentIdStorage] = useLocalStorage<string>(storageKeys.agentId);
  return agentIdStorage ?? agentBuilderDefaultAgentId;
};
