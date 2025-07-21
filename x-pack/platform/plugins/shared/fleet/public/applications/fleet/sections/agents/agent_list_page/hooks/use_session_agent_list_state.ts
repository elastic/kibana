/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useRef, useEffect } from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';
import useSessionStorage from 'react-use/lib/useSessionStorage';

import type { Agent } from '../../../../types';

const FLEET_NAMESPACE = 'fleet';
const AGENT_LIST_SESSION_STORAGE_KEY = 'agentListState';

export interface AgentListTableState {
  search: string;
  selectedAgentPolicies: string[];
  selectedStatus: string[];
  selectedTags: string[];
  showUpgradeable: boolean;
  sort: {
    field: keyof Agent;
    direction: 'asc' | 'desc';
  };
  page: {
    index: number;
    size: number;
  };
}

interface SessionAgentListStateOptions {
  defaultState: AgentListTableState;
  storageKey?: string;
  namespace?: string;
}

type SessionAgentListState = AgentListTableState & {
  clearFilters: () => void;
  resetToDefaults: () => void;
  updateTableState: (partialState: Partial<AgentListTableState>) => void;
  onTableChange: (changes: Partial<CriteriaWithPagination<Agent>>) => void;
};

export const getDefaultAgentListState = (): AgentListTableState => ({
  search: '',
  selectedAgentPolicies: [],
  selectedStatus: ['healthy', 'unhealthy', 'orphaned', 'updating', 'offline'],
  selectedTags: [],
  showUpgradeable: false,
  sort: {
    field: 'enrolled_at',
    direction: 'desc',
  },
  page: {
    index: 0,
    size: 20,
  },
});

export const useSessionAgentListState = ({
  defaultState,
  storageKey = AGENT_LIST_SESSION_STORAGE_KEY,
  namespace = FLEET_NAMESPACE,
}: SessionAgentListStateOptions): SessionAgentListState => {
  const fullStorageKey = `${namespace}.${storageKey}`;

  const [sessionState, setSessionState] = useSessionStorage<AgentListTableState>(
    fullStorageKey,
    defaultState
  );

  // Use a ref to always have access to the latest state without stale closures
  const stateRef = useRef<AgentListTableState>(sessionState || defaultState);

  // Update the ref whenever sessionState changes
  useEffect(() => {
    stateRef.current = sessionState || defaultState;
  }, [sessionState, defaultState]);

  // Get current state, fallback to default if session storage fails
  const currentState = useMemo(() => {
    return sessionState || defaultState;
  }, [sessionState, defaultState]);

  // Create a function to get the latest state from ref - this avoids stale closure issues
  const getLatestState = useCallback(() => {
    return stateRef.current;
  }, []);

  // Utility functions
  const updateTableState = useCallback(
    (partialState: Partial<AgentListTableState>) => {
      const newState = { ...getLatestState(), ...partialState };
      setSessionState(newState);
    },
    [setSessionState, getLatestState]
  );

  // Atomic update function for table changes - prevents multiple rapid updates
  const onTableChange = useCallback(
    (changes: Partial<CriteriaWithPagination<Agent>>) => {
      const latestState = getLatestState();
      const updates: Partial<AgentListTableState> = {};

      // Check if pagination has actually changed
      if (
        changes.page &&
        (changes.page.index !== latestState.page.index ||
          changes.page.size !== latestState.page.size)
      ) {
        updates.page = {
          index: changes.page.index,
          size: changes.page.size,
        };
      }

      // Check if sort has actually changed
      if (
        changes.sort &&
        (!latestState.sort ||
          changes.sort.field !== latestState.sort.field ||
          changes.sort.direction !== latestState.sort.direction)
      ) {
        updates.sort = {
          field: changes.sort.field,
          direction: changes.sort.direction,
        };
      }

      // Only update if there are actual changes
      if (Object.keys(updates).length > 0) {
        const newState = { ...latestState, ...updates };
        setSessionState(newState);
      }
    },
    [setSessionState, getLatestState]
  );

  const clearFilters = useCallback(() => {
    const latestState = getLatestState();
    updateTableState({
      search: '',
      selectedAgentPolicies: [],
      selectedStatus: defaultState.selectedStatus,
      selectedTags: [],
      showUpgradeable: false,
      page: {
        ...latestState.page,
        index: 0, // Reset to first page
      },
    });
  }, [updateTableState, defaultState, getLatestState]);

  const resetToDefaults = useCallback(() => {
    setSessionState(defaultState);
  }, [setSessionState, defaultState]);

  return {
    // Current state
    search: currentState.search,
    selectedAgentPolicies: currentState.selectedAgentPolicies,
    selectedStatus: currentState.selectedStatus,
    selectedTags: currentState.selectedTags,
    showUpgradeable: currentState.showUpgradeable,
    sort: currentState.sort,
    page: currentState.page,

    // Utility functions
    clearFilters,
    resetToDefaults,
    updateTableState,
    onTableChange,
  };
};
