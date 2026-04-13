/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { SML_SEARCH_DEFAULT_SIZE } from '../../../../../../../../services/sml/constants';
import { queryKeys } from '../../../../../../../query_keys';
import { usePrefetchSml } from './use_prefetch_sml';

const mockPrefetchQuery = jest.fn();
const mockSearch = jest.fn();

jest.mock('@kbn/react-query', () => ({
  useQueryClient: () => ({
    prefetchQuery: mockPrefetchQuery,
  }),
}));

jest.mock('../../../../../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    smlService: { search: mockSearch },
  }),
}));

let mockExperimentalEnabled = true;
jest.mock('../../../../../../../hooks/use_experimental_features', () => ({
  useExperimentalFeatures: () => mockExperimentalEnabled,
}));

describe('usePrefetchSml', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExperimentalEnabled = true;
  });

  it('prefetches wildcard SML search when experimental features are enabled', () => {
    const { result } = renderHook(() => usePrefetchSml());

    act(() => {
      result.current();
    });

    expect(mockPrefetchQuery).toHaveBeenCalledTimes(1);
    expect(mockPrefetchQuery).toHaveBeenCalledWith({
      queryKey: queryKeys.sml.search('*', true),
      queryFn: expect.any(Function),
    });
    const queryFn = mockPrefetchQuery.mock.calls[0][0].queryFn as () => Promise<unknown>;
    void queryFn();
    expect(mockSearch).toHaveBeenCalledWith({
      query: '*',
      size: SML_SEARCH_DEFAULT_SIZE,
      skipContent: true,
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
});
