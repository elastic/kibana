/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { defaultAgentListState, useSessionAgentListState } from './use_session_agent_list_state';

// Mock react-use/lib/useSessionStorage
const mockSetSessionState = jest.fn();
const mockSessionState = jest.fn();

jest.mock('react-use/lib/useSessionStorage', () => {
  return jest.fn(() => [mockSessionState(), mockSetSessionState]);
});

describe('useSessionAgentListState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock to return default state
    mockSessionState.mockReturnValue(defaultAgentListState);
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSessionAgentListState());

      expect(result.current.search).toBe('');
      expect(result.current.selectedAgentPolicies).toEqual([]);
      expect(result.current.selectedStatus).toEqual([
        'healthy',
        'unhealthy',
        'orphaned',
        'updating',
        'offline',
      ]);
      expect(result.current.selectedTags).toEqual([]);
      expect(result.current.showUpgradeable).toBe(false);
      expect(result.current.sort).toEqual({ field: 'enrolled_at', direction: 'desc' });
      expect(result.current.page).toEqual({ index: 0, size: 20 });
    });
  });

  describe('updateTableState', () => {
    it('should update search state', () => {
      const { result } = renderHook(() => useSessionAgentListState());

      act(() => {
        result.current.updateTableState({ search: 'test query' });
      });

      expect(mockSetSessionState).toHaveBeenCalledWith({
        ...defaultAgentListState,
        search: 'test query',
      });
    });

    it('should update selected agent policies', () => {
      const { result } = renderHook(() => useSessionAgentListState());

      act(() => {
        result.current.updateTableState({ selectedAgentPolicies: ['policy1', 'policy2'] });
      });

      expect(mockSetSessionState).toHaveBeenCalledWith({
        ...defaultAgentListState,
        selectedAgentPolicies: ['policy1', 'policy2'],
      });
    });

    it('should update selected status', () => {
      const { result } = renderHook(() => useSessionAgentListState());

      act(() => {
        result.current.updateTableState({ selectedStatus: ['healthy', 'offline'] });
      });

      expect(mockSetSessionState).toHaveBeenCalledWith({
        ...defaultAgentListState,
        selectedStatus: ['healthy', 'offline'],
      });
    });

    it('should update selected tags', () => {
      const { result } = renderHook(() => useSessionAgentListState());

      act(() => {
        result.current.updateTableState({ selectedTags: ['tag1', 'tag2'] });
      });

      expect(mockSetSessionState).toHaveBeenCalledWith({
        ...defaultAgentListState,
        selectedTags: ['tag1', 'tag2'],
      });
    });

    it('should update show upgradeable flag', () => {
      const { result } = renderHook(() => useSessionAgentListState());

      act(() => {
        result.current.updateTableState({ showUpgradeable: true });
      });

      expect(mockSetSessionState).toHaveBeenCalledWith({
        ...defaultAgentListState,
        showUpgradeable: true,
      });
    });

    it('should update sort configuration', () => {
      const { result } = renderHook(() => useSessionAgentListState());

      act(() => {
        result.current.updateTableState({
          sort: { field: 'status', direction: 'asc' },
        });
      });

      expect(mockSetSessionState).toHaveBeenCalledWith({
        ...defaultAgentListState,
        sort: { field: 'status', direction: 'asc' },
      });
    });

    it('should update pagination configuration', () => {
      const { result } = renderHook(() => useSessionAgentListState());

      act(() => {
        result.current.updateTableState({
          page: { index: 1, size: 50 },
        });
      });

      expect(mockSetSessionState).toHaveBeenCalledWith({
        ...defaultAgentListState,
        page: { index: 1, size: 50 },
      });
    });

    it('should update multiple properties at once', () => {
      const { result } = renderHook(() => useSessionAgentListState());

      const partialUpdate = {
        search: 'new search',
        sort: { field: 'status', direction: 'asc' },
        page: { index: 1, size: 10 },
      };

      act(() => {
        result.current.updateTableState(partialUpdate as any);
      });

      expect(mockSetSessionState).toHaveBeenCalledWith({
        ...defaultAgentListState,
        ...partialUpdate,
      });
    });
  });

  describe('onTableChange', () => {
    it('should update table state atomically with pagination changes', () => {
      const { result } = renderHook(() => useSessionAgentListState());

      act(() => {
        result.current.onTableChange({
          page: { index: 2, size: 50 },
        });
      });

      expect(mockSetSessionState).toHaveBeenCalledWith({
        ...defaultAgentListState,
        page: { index: 2, size: 50 },
      });
    });

    it('should update table state atomically with sort changes', () => {
      const { result } = renderHook(() => useSessionAgentListState());

      act(() => {
        result.current.onTableChange({
          sort: { field: 'status', direction: 'asc' },
        });
      });

      expect(mockSetSessionState).toHaveBeenCalledWith({
        ...defaultAgentListState,
        sort: { field: 'status', direction: 'asc' },
      });
    });

    it('should update both pagination and sort atomically', () => {
      const { result } = renderHook(() => useSessionAgentListState());

      act(() => {
        result.current.onTableChange({
          page: { index: 2, size: 50 },
          sort: { field: 'status', direction: 'asc' },
        });
      });

      expect(mockSetSessionState).toHaveBeenCalledWith({
        ...defaultAgentListState,
        page: { index: 2, size: 50 },
        sort: { field: 'status', direction: 'asc' },
      });
    });

    it('should not update if no changes are detected', () => {
      const { result } = renderHook(() => useSessionAgentListState());

      act(() => {
        result.current.onTableChange({
          page: defaultAgentListState.page,
          sort: defaultAgentListState.sort,
        });
      });

      expect(mockSetSessionState).not.toHaveBeenCalled();
    });

    it('should only update changed properties', () => {
      const customState = {
        ...defaultAgentListState,
        sort: { field: 'status' as const, direction: 'asc' as const },
      };
      mockSessionState.mockReturnValue(customState);

      const { result } = renderHook(() => useSessionAgentListState());

      act(() => {
        result.current.onTableChange({
          page: { index: 1, size: 25 },
          sort: { field: 'status', direction: 'asc' }, // Same as current
        });
      });

      expect(mockSetSessionState).toHaveBeenCalledWith({
        ...customState,
        page: { index: 1, size: 25 },
      });
    });
  });

  describe('clearFilters', () => {
    it('should reset filters to default state and reset pagination to first page', () => {
      const customState = {
        ...defaultAgentListState,
        search: 'test',
        selectedAgentPolicies: ['policy1'],
        selectedTags: ['tag1'],
        showUpgradeable: true,
        page: { index: 2, size: 50 },
      };
      mockSessionState.mockReturnValue(customState);

      const { result } = renderHook(() => useSessionAgentListState());

      act(() => {
        result.current.clearFilters();
      });

      expect(mockSetSessionState).toHaveBeenCalledWith({
        ...customState,
        search: defaultAgentListState.search,
        selectedAgentPolicies: defaultAgentListState.selectedAgentPolicies,
        selectedStatus: defaultAgentListState.selectedStatus,
        selectedTags: defaultAgentListState.selectedTags,
        showUpgradeable: defaultAgentListState.showUpgradeable,
        page: {
          ...customState.page,
          index: 0, // Reset to first page
        },
      });
    });

    it('should preserve page size when resetting filters', () => {
      const customState = {
        ...defaultAgentListState,
        search: 'test',
        page: { index: 2, size: 100 },
      };
      mockSessionState.mockReturnValue(customState);

      const { result } = renderHook(() => useSessionAgentListState());

      act(() => {
        result.current.clearFilters();
      });

      expect(mockSetSessionState).toHaveBeenCalledWith({
        ...customState,
        search: defaultAgentListState.search,
        selectedAgentPolicies: defaultAgentListState.selectedAgentPolicies,
        selectedStatus: defaultAgentListState.selectedStatus,
        selectedTags: defaultAgentListState.selectedTags,
        showUpgradeable: defaultAgentListState.showUpgradeable,
        page: {
          index: 0,
          size: 100, // Preserve page size
        },
      });
    });
  });

  describe('state consistency', () => {
    it('should handle rapid sequential updates correctly', () => {
      const { result } = renderHook(() => useSessionAgentListState());

      act(() => {
        result.current.updateTableState({ search: 'search1' });
        result.current.updateTableState({ search: 'search2' });
        result.current.onTableChange({ page: { index: 1, size: 25 } });
        result.current.updateTableState({ search: 'final search' });
      });

      // Should have been called 4 times with different states
      expect(mockSetSessionState).toHaveBeenCalledTimes(4);

      // Last call should have the final search value and page change
      const lastCall = mockSetSessionState.mock.calls[3][0];
      expect(lastCall.search).toBe('final search');
    });

    it('should maintain state consistency across re-renders', () => {
      const { result, rerender } = renderHook(() => useSessionAgentListState());

      act(() => {
        result.current.updateTableState({ search: 'test' });
      });

      // Update mock to return updated state
      const updatedState = { ...defaultAgentListState, search: 'test' };
      mockSessionState.mockReturnValue(updatedState);

      rerender();

      expect(result.current.search).toBe('test');
    });
  });

  describe('defaultAgentListState', () => {
    it('should return correct default state structure', () => {
      const result = defaultAgentListState;

      expect(result).toEqual({
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
    });
  });

  describe('function stability', () => {
    it('should have stable function references across re-renders', () => {
      const { result, rerender } = renderHook(() => useSessionAgentListState());

      const initialFunctions = {
        updateTableState: result.current.updateTableState,
        onTableChange: result.current.onTableChange,
        clearFilters: result.current.clearFilters,
      };

      rerender();

      expect(result.current.updateTableState).toBe(initialFunctions.updateTableState);
      expect(result.current.onTableChange).toBe(initialFunctions.onTableChange);
      expect(result.current.clearFilters).toBe(initialFunctions.clearFilters);
    });
  });
});
