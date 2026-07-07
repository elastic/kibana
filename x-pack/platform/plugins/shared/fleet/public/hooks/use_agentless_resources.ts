/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

import { useStartServices } from './use_core';

const AGENTLESS_TOGGLE_STORAGE_KEY = 'fleet:showAgentlessResources';

/**
 * Hook to manage the agentless resources toggle state
 * @returns object with current state and setter function
 */
export function useAgentlessResources() {
  const { storage } = useStartServices();

  const initialValue = useMemo(() => {
    try {
      const stored = storage.get(AGENTLESS_TOGGLE_STORAGE_KEY);
      return stored === true;
    } catch (error) {
      // In case storage is not available (e.g., in tests or restricted environments)
      return false;
    }
  }, [storage]);

  const [showAgentless, setShowAgentlessState] = useState<boolean>(initialValue);

  const setShowAgentless = useCallback(
    (enabled: boolean) => {
      try {
        storage.set(AGENTLESS_TOGGLE_STORAGE_KEY, enabled);
        setShowAgentlessState(enabled);
      } catch (error) {
        // Silently fail if storage is not available, but still update state
        setShowAgentlessState(enabled);
      }
    },
    [storage]
  );

  return { showAgentless, setShowAgentless };
}
