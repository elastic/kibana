/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { act, renderHook } from '@testing-library/react';
import { SmlSearchFilterType } from '@kbn/agent-builder-sml-plugin/public';
import { SML_SEARCH_DEFAULT_SIZE } from '../../../../../../../../services/sml/constants';
import { queryKeys } from '../../../../../../../query_keys';
import { usePrefetchSml } from './use_prefetch_sml';

const mockPrefetchQuery = vi.fn();
const mockAutocomplete = vi.fn();

vi.mock('@kbn/react-query', () => {
  const mocked = {
    useQueryClient: () => ({
      prefetchQuery: mockPrefetchQuery,
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../../../hooks/use_agent_builder_service', () => {
  const mocked = {
    useAgentBuilderServices: () => ({
      smlService: { autocomplete: mockAutocomplete },
    }),
  };
  return { ...mocked, default: mocked };
});

let mockExperimentalEnabled = true;
vi.mock('../../../../../../../hooks/use_experimental_features', () => {
  const mocked = {
    useExperimentalFeatures: () => mockExperimentalEnabled,
  };
  return { ...mocked, default: mocked };
});

describe('usePrefetchSml', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExperimentalEnabled = true;
  });

  it('prefetches wildcard SML autocomplete when experimental features are enabled', () => {
    const { result } = renderHook(() => usePrefetchSml());

    act(() => {
      result.current();
    });

    expect(mockPrefetchQuery).toHaveBeenCalledTimes(1);
    expect(mockPrefetchQuery).toHaveBeenCalledWith({
      queryKey: queryKeys.sml.autocomplete('*'),
      queryFn: expect.any(Function),
    });
    const queryFn = mockPrefetchQuery.mock.calls[0][0].queryFn as () => Promise<unknown>;
    void queryFn();
    expect(mockAutocomplete).toHaveBeenCalledWith({
      query: '*',
      size: SML_SEARCH_DEFAULT_SIZE,
      constraints: undefined,
    });
  });

  it('does not prefetch when experimental features are disabled', () => {
    mockExperimentalEnabled = false;
    const { result } = renderHook(() => usePrefetchSml());

    act(() => {
      result.current();
    });

    expect(mockPrefetchQuery).not.toHaveBeenCalled();
  });

  it('threads agent-derived constraints into the prefetch call and query key', () => {
    const constraints = { [SmlSearchFilterType.connector]: { ids: ['gh-1'] } };
    const { result } = renderHook(() => usePrefetchSml(constraints));

    act(() => {
      result.current();
    });

    expect(mockPrefetchQuery).toHaveBeenCalledWith({
      queryKey: queryKeys.sml.autocomplete('*', constraints),
      queryFn: expect.any(Function),
    });
    const queryFn = mockPrefetchQuery.mock.calls[0][0].queryFn as () => Promise<unknown>;
    void queryFn();
    expect(mockAutocomplete).toHaveBeenCalledWith({
      query: '*',
      size: SML_SEARCH_DEFAULT_SIZE,
      constraints,
    });
  });
});
