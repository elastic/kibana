/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';

import { useStartServices } from './use_core';

const AGENTLESS_TOGGLE_STORAGE_KEY = 'fleet:showAgentlessResources';

/**
 * Hook to get the current state of the "Show agentless resources" toggle
 * @returns boolean - true if agentless resources should be shown, false otherwise
 */
export function useShowAgentlessResourcesFlag(): boolean {
  const { storage } = useStartServices();

  return useMemo(() => {
    try {
      const stored = storage.get(AGENTLESS_TOGGLE_STORAGE_KEY);
      return stored === true;
    } catch (error) {
      // In case storage is not available (e.g., in tests or restricted environments)
      return false;
    }
  }, [storage]);
}

/**
 * Hook to set the state of the "Show agentless resources" toggle
 * @returns function to set the toggle state
 */
export function useSetShowAgentlessResourcesFlag() {
  const { storage } = useStartServices();

  return useCallback(
    (enabled: boolean) => {
      try {
        storage.set(AGENTLESS_TOGGLE_STORAGE_KEY, enabled);
      } catch (error) {
        // Silently fail if storage is not available
      }
    },
    [storage]
  );
}

/**
 * Combined hook to manage the agentless resources toggle state
 * @returns object with current state and setter function
 */
export function useAgentlessResourcesToggle() {
  const showAgentless = useShowAgentlessResourcesFlag();
  const setShowAgentless = useSetShowAgentlessResourcesFlag();

  return { showAgentless, setShowAgentless };
}
