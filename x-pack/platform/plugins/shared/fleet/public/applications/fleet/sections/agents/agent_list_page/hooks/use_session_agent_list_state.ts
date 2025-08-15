/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';
import useSessionStorage from 'react-use/lib/useSessionStorage';

import type { Agent } from '../../../../types';

const FLEET_NAMESPACE = 'fleet';
const AGENT_LIST_SESSION_STORAGE_KEY = 'agentListState';

interface AgentListTableState {
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

type SessionAgentListState = AgentListTableState & {
  clearFilters: () => void;
  updateTableState: (partialState: Partial<AgentListTableState>) => void;
  onTableChange: (changes: Partial<CriteriaWithPagination<Agent>>) => void;
};

export const defaultAgentListState: AgentListTableState = {
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
};

export const useSessionAgentListState = (): SessionAgentListState => {
  const fullStorageKey = `${FLEET_NAMESPACE}.${AGENT_LIST_SESSION_STORAGE_KEY}`;

  const [sessionState, setSessionState] = useSessionStorage<AgentListTableState>(
    fullStorageKey,
    defaultAgentListState
  );

  // Utility functions
  const updateTableState = useCallback(
    (partialState: Partial<AgentListTableState>) => {
      const newState = { ...sessionState, ...partialState };
      setSessionState(newState);
    },
    [sessionState, setSessionState]
  );

  // Atomic update function for table changes - prevents multiple rapid updates
  const onTableChange = useCallback(
    (changes: Partial<CriteriaWithPagination<Agent>>) => {
      const latestState = sessionState;
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
    [sessionState, setSessionState]
  );

  // Clear filters by resetting to defaults
  // Do not reset sort parameters, but reset page back to index 0
  const clearFilters = useCallback(() => {
    const latestState = sessionState;
    const { search, selectedAgentPolicies, selectedStatus, selectedTags, showUpgradeable } =
      defaultAgentListState;
    updateTableState({
      search,
      selectedAgentPolicies,
      selectedStatus,
      selectedTags,
      showUpgradeable,
      page: {
        ...latestState.page,
        index: 0, // Reset to first page
      },
    });
  }, [sessionState, updateTableState]);

  return {
    // Current state
    search: sessionState.search,
    selectedAgentPolicies: sessionState.selectedAgentPolicies,
    selectedStatus: sessionState.selectedStatus,
    selectedTags: sessionState.selectedTags,
    showUpgradeable: sessionState.showUpgradeable,
    sort: sessionState.sort,
    page: sessionState.page,

    // Utility functions
    clearFilters,
    updateTableState,
    onTableChange,
  };
};
