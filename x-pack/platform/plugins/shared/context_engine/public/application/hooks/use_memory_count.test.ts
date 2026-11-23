/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useMemoryCount } from './use_memory_count';

jest.mock('./use_list_ki');

const { useListKi } = jest.requireMock('./use_list_ki');

const listResult = (overrides: Record<string, unknown> = {}) => ({
  kis: [],
  total: 0,
  summary: { total: 0, countsByType: [] },
  isLoading: false,
  isFetching: false,
  isPreviousData: false,
  error: undefined,
  refetch: jest.fn(),
  ...overrides,
});

describe('useMemoryCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('counts each memory type with its own filter, not the top types summary', () => {
    useListKi.mockImplementation(({ type }: { type: string }) =>
      listResult({ total: type === 'memory.session' ? 2 : 3 })
    );

    const { result } = renderHook(() => useMemoryCount('my-ai-index', { enabled: true }));

    expect(result.current).toEqual({ memoryCount: 5, isLoading: false });
    expect(useListKi).toHaveBeenCalledWith(
      expect.objectContaining({ aiIndexId: 'my-ai-index', size: 0, type: 'memory.session' })
    );
    expect(useListKi).toHaveBeenCalledWith(
      expect.objectContaining({ aiIndexId: 'my-ai-index', size: 0, type: 'memory.session_fact' })
    );
  });

  it('is loading while a count still shows the previous AI index', () => {
    useListKi.mockReturnValue(listResult({ total: 4, isPreviousData: true }));

    const { result } = renderHook(() => useMemoryCount('other-ai-index', { enabled: true }));

    expect(result.current.isLoading).toBe(true);
  });

  it('is 0 and not loading when disabled', () => {
    useListKi.mockReturnValue(listResult({ total: 4, isLoading: true }));

    const { result } = renderHook(() => useMemoryCount('my-ai-index', { enabled: false }));

    expect(result.current).toEqual({ memoryCount: 0, isLoading: false });
  });
});
