/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { CeSearchFilterType } from '@kbn/context-engine-plugin/public';
import { CE_SEARCH_DEFAULT_SIZE } from '../../../../../../../../services/ce/constants';
import { queryKeys } from '../../../../../../../query_keys';
import { usePrefetchCe } from './use_prefetch_ce';

const mockPrefetchQuery = jest.fn();
const mockAutocomplete = jest.fn();

jest.mock('@kbn/react-query', () => ({
  useQueryClient: () => ({
    prefetchQuery: mockPrefetchQuery,
  }),
}));

jest.mock('../../../../../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    ceService: { autocomplete: mockAutocomplete },
  }),
}));

let mockContextEngineEnabled = true;
jest.mock('../../../../../../../hooks/use_context_engine_enabled', () => ({
  useContextEngineEnabled: () => mockContextEngineEnabled,
}));

let mockExperimentalEnabled = true;
jest.mock('../../../../../../../hooks/use_experimental_features', () => ({
  useExperimentalFeatures: () => mockExperimentalEnabled,
}));

describe('usePrefetchCe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextEngineEnabled = true;
    mockExperimentalEnabled = true;
  });

  it('prefetches wildcard CE autocomplete when the Context Engine and experimental features are enabled', () => {
    const { result } = renderHook(() => usePrefetchCe());

    act(() => {
      result.current();
    });

    expect(mockPrefetchQuery).toHaveBeenCalledTimes(1);
    expect(mockPrefetchQuery).toHaveBeenCalledWith({
      queryKey: queryKeys.ce.autocomplete('*'),
      queryFn: expect.any(Function),
    });
    const queryFn = mockPrefetchQuery.mock.calls[0][0].queryFn as () => Promise<unknown>;
    void queryFn();
    expect(mockAutocomplete).toHaveBeenCalledWith({
      query: '*',
      size: CE_SEARCH_DEFAULT_SIZE,
      constraints: undefined,
    });
  });

  it('does not prefetch when the Context Engine is disabled', () => {
    mockContextEngineEnabled = false;
    const { result } = renderHook(() => usePrefetchCe());

    act(() => {
      result.current();
    });

    expect(mockPrefetchQuery).not.toHaveBeenCalled();
  });

  it('does not prefetch when experimental features are disabled', () => {
    mockExperimentalEnabled = false;
    const { result } = renderHook(() => usePrefetchCe());

    act(() => {
      result.current();
    });

    expect(mockPrefetchQuery).not.toHaveBeenCalled();
  });

  it('threads agent-derived constraints into the prefetch call and query key', () => {
    const constraints = { [CeSearchFilterType.connector]: { ids: ['gh-1'] } };
    const { result } = renderHook(() => usePrefetchCe(constraints));

    act(() => {
      result.current();
    });

    expect(mockPrefetchQuery).toHaveBeenCalledWith({
      queryKey: queryKeys.ce.autocomplete('*', constraints),
      queryFn: expect.any(Function),
    });
    const queryFn = mockPrefetchQuery.mock.calls[0][0].queryFn as () => Promise<unknown>;
    void queryFn();
    expect(mockAutocomplete).toHaveBeenCalledWith({
      query: '*',
      size: CE_SEARCH_DEFAULT_SIZE,
      constraints,
    });
  });
});
