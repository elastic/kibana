/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { DEFAULT_KI_PAGE_SIZE, MAX_KI_PAGE_SIZE } from '../../../../../common/constants';
import { listKiTestAiIndex } from './test_helpers';
import { useListKiPanel } from './use_list_ki_panel';

const mockUseListKi = jest.fn();

jest.mock('../../../hooks/use_list_ki', () => ({
  useListKi: (...args: unknown[]) => mockUseListKi(...args),
}));

const listKiQuery = () => mockUseListKi.mock.calls.at(-1)?.[0];

describe('useListKiPanel', () => {
  beforeEach(() => {
    mockUseListKi.mockReturnValue({
      kis: [],
      total: 0,
      summary: { total: 0, countsByType: [] },
      isLoading: false,
      isFetching: false,
      error: undefined,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('keeps query undefined until search is submitted', () => {
    const { result } = renderHook(() => useListKiPanel(listKiTestAiIndex));

    expect(listKiQuery()).toEqual(expect.objectContaining({ query: undefined }));

    act(() => {
      result.current.onSearchTextChange('refund');
    });

    expect(listKiQuery()).toEqual(expect.objectContaining({ query: undefined }));

    act(() => {
      result.current.onSearchSubmit('refund');
    });

    expect(listKiQuery()).toEqual(expect.objectContaining({ query: 'refund' }));
    expect(result.current.submittedQuery).toBe('refund');
  });

  it('trims text when committing search', () => {
    const { result } = renderHook(() => useListKiPanel(listKiTestAiIndex));

    act(() => {
      result.current.onSearchSubmit('  refund  ');
    });

    expect(result.current.searchText).toBe('refund');
    expect(result.current.submittedQuery).toBe('refund');
    expect(listKiQuery()).toEqual(expect.objectContaining({ query: 'refund' }));
  });

  it('does not reset page size when committing the same trimmed query', () => {
    const { result } = renderHook(() => useListKiPanel(listKiTestAiIndex));

    act(() => {
      result.current.onSearchSubmit('refund');
      result.current.loadMore();
    });

    expect(result.current.size).toBe(DEFAULT_KI_PAGE_SIZE * 2);

    act(() => {
      result.current.onSearchSubmit('refund');
    });

    expect(result.current.size).toBe(DEFAULT_KI_PAGE_SIZE * 2);
  });

  it('resets page size when a different search is submitted', () => {
    const { result } = renderHook(() => useListKiPanel(listKiTestAiIndex));

    act(() => {
      result.current.onSearchSubmit('first');
      result.current.loadMore();
      result.current.onSearchSubmit('second');
    });

    expect(result.current.size).toBe(DEFAULT_KI_PAGE_SIZE);
    expect(listKiQuery()).toEqual(expect.objectContaining({ query: 'second' }));
  });

  it('resets page size when type or status filters change', () => {
    const { result } = renderHook(() => useListKiPanel(listKiTestAiIndex));

    act(() => {
      result.current.loadMore();
      result.current.onTypeFilterChange({ kind: 'type', value: 'playbook' });
    });

    expect(result.current.size).toBe(DEFAULT_KI_PAGE_SIZE);
    expect(listKiQuery()).toEqual(expect.objectContaining({ type: 'playbook' }));

    act(() => {
      result.current.loadMore();
      result.current.onStatusFilterChange('deleted');
    });

    expect(result.current.size).toBe(DEFAULT_KI_PAGE_SIZE);
    expect(listKiQuery()).toEqual(expect.objectContaining({ lifecycleStatus: ['deleted'] }));
  });

  it('caps loadMore at MAX_KI_PAGE_SIZE', () => {
    const { result } = renderHook(() => useListKiPanel(listKiTestAiIndex));

    act(() => {
      for (let step = 0; step < 10; step += 1) {
        result.current.loadMore();
      }
    });

    expect(result.current.size).toBe(MAX_KI_PAGE_SIZE);
  });
});
