/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../common/saved_object_types';
import { useInstalledRuleCounts } from './use_installed_rule_counts';

jest.mock('@kbn/core-di-browser');

const mockListRules = jest.fn();
const mockUseService = useService as jest.MockedFunction<typeof useService>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useInstalledRuleCounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseService.mockReturnValue({ listRules: mockListRules } as any);
  });

  it('fetches counts for each template id', async () => {
    mockListRules
      .mockResolvedValueOnce({ total: 3, items: [], page: 1, per_page: 0 })
      .mockResolvedValueOnce({ total: 0, items: [], page: 1, per_page: 0 });

    const { result } = renderHook(() => useInstalledRuleCounts(['tpl-a', 'tpl-b']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.counts.get('tpl-a')).toBe(3);
    expect(result.current.counts.get('tpl-b')).toBe(0);

    expect(mockListRules).toHaveBeenCalledWith({
      per_page: 0,
      has_reference_type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      has_reference_id: 'tpl-a',
    });
    expect(mockListRules).toHaveBeenCalledWith({
      per_page: 0,
      has_reference_type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      has_reference_id: 'tpl-b',
    });
  });

  it('returns an empty map when templateIds is empty', async () => {
    const { result } = renderHook(() => useInstalledRuleCounts([]), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.counts.size).toBe(0);
    expect(mockListRules).not.toHaveBeenCalled();
  });

  it('reports isLoading while queries are in flight', () => {
    mockListRules.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useInstalledRuleCounts(['tpl-x']), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});
