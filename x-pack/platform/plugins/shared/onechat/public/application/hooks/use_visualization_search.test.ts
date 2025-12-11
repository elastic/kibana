/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useVisualizationSearch } from './use_visualization_search';

// Mock the useKibana hook
const mockMSearch = jest.fn();

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      plugins: {
        contentManagement: {
          client: {
            mSearch: mockMSearch,
          },
        },
      },
    },
  }),
}));

// Mock lodash debounce to execute immediately for testing
jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: (fn: Function) => {
    const debounced = fn;
    (debounced as any).cancel = jest.fn();
    return debounced;
  },
}));

describe('useVisualizationSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMSearch.mockReset();
  });

  it('should initialize with empty suggestions and no loading state', () => {
    const { result } = renderHook(() => useVisualizationSearch());

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should search and return suggestions', async () => {
    mockMSearch.mockResolvedValue({
      hits: [
        {
          id: 'lens-1',
          type: 'lens',
          attributes: {
            title: 'Sales Dashboard',
            description: 'Q4 sales metrics',
          },
        },
        {
          id: 'viz-1',
          type: 'visualization',
          attributes: {
            title: 'Revenue Chart',
          },
        },
      ],
      pagination: {
        total: 2,
      },
    });

    const { result } = renderHook(() => useVisualizationSearch());

    act(() => {
      result.current.search('sales');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.suggestions).toHaveLength(2);
    expect(result.current.suggestions[0]).toEqual({
      id: 'lens-1',
      title: 'Sales Dashboard',
      type: 'lens',
      description: 'Q4 sales metrics',
    });
    expect(result.current.suggestions[1]).toEqual({
      id: 'viz-1',
      title: 'Revenue Chart',
      type: 'visualization',
      description: undefined,
    });
  });

  it('should search across lens, visualization, and map content types', async () => {
    mockMSearch.mockResolvedValue({
      hits: [],
      pagination: { total: 0 },
    });

    const { result } = renderHook(() => useVisualizationSearch());

    act(() => {
      result.current.search('test');
    });

    await waitFor(() => {
      expect(mockMSearch).toHaveBeenCalled();
    });

    expect(mockMSearch).toHaveBeenCalledWith({
      contentTypes: [
        { contentTypeId: 'lens' },
        { contentTypeId: 'visualization' },
        { contentTypeId: 'map' },
      ],
      query: {
        text: 'test',
        limit: 10,
      },
    });
  });

  it('should clear suggestions for empty search term', async () => {
    mockMSearch.mockResolvedValue({
      hits: [
        {
          id: 'lens-1',
          type: 'lens',
          attributes: { title: 'Dashboard' },
        },
      ],
      pagination: { total: 1 },
    });

    const { result } = renderHook(() => useVisualizationSearch());

    // First perform a search
    act(() => {
      result.current.search('dashboard');
    });

    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });

    // Then clear with empty search
    act(() => {
      result.current.search('');
    });

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    const testError = new Error('Network error');
    mockMSearch.mockRejectedValue(testError);

    const { result } = renderHook(() => useVisualizationSearch());

    act(() => {
      result.current.search('test');
    });

    await waitFor(() => {
      expect(result.current.error).toEqual(testError);
    });

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should clear all state when clear() is called', async () => {
    mockMSearch.mockResolvedValue({
      hits: [
        {
          id: 'lens-1',
          type: 'lens',
          attributes: { title: 'Dashboard' },
        },
      ],
      pagination: { total: 1 },
    });

    const { result } = renderHook(() => useVisualizationSearch());

    // First perform a search
    act(() => {
      result.current.search('dashboard');
    });

    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });

    // Then clear
    act(() => {
      result.current.clear();
    });

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle missing title gracefully', async () => {
    mockMSearch.mockResolvedValue({
      hits: [
        {
          id: 'lens-1',
          type: 'lens',
          attributes: {},
        },
      ],
      pagination: { total: 1 },
    });

    const { result } = renderHook(() => useVisualizationSearch());

    act(() => {
      result.current.search('test');
    });

    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });

    expect(result.current.suggestions[0].title).toBe('Untitled');
  });
});
