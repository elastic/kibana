/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useFetchRuleTags } from './use_fetch_rule_tags';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { RulesApi } from '../services/rules_api';

jest.mock('@kbn/core-di-browser');
jest.mock('../services/rules_api');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useFetchRuleTags', () => {
  const mockListTags = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart.mockImplementation((key: string) => key as any);
    mockUseService.mockImplementation((service: unknown) => {
      if (service === RulesApi) {
        return { listTags: mockListTags } as any;
      }
      return undefined as any;
    });
  });

  it('returns tags from the wrapped response', async () => {
    mockListTags.mockResolvedValue({ tags: ['cpu', 'memory'] });

    const { result } = renderHook(() => useFetchRuleTags(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data).toEqual(['cpu', 'memory']);
    });
  });

  it('forwards search param to listTags', async () => {
    mockListTags.mockResolvedValue({ tags: ['production'] });

    const { result } = renderHook(() => useFetchRuleTags({ search: 'pro' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockListTags).toHaveBeenCalledWith(expect.objectContaining({ search: 'pro' }));
  });

  it('forwards kind param to listTags', async () => {
    mockListTags.mockResolvedValue({ tags: ['alert-tag'] });

    const { result } = renderHook(() => useFetchRuleTags({ kind: 'alert' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockListTags).toHaveBeenCalledWith(expect.objectContaining({ kind: 'alert' }));
  });

  it('does not fetch when enabled is false', () => {
    renderHook(() => useFetchRuleTags({ enabled: false }), { wrapper: createWrapper() });

    expect(mockListTags).not.toHaveBeenCalled();
  });

  it('uses separate cache entries for different search values', async () => {
    mockListTags
      .mockResolvedValueOnce({ tags: ['prod'] })
      .mockResolvedValueOnce({ tags: ['staging'] });

    const { result: r1 } = renderHook(() => useFetchRuleTags({ search: 'pro' }), {
      wrapper: createWrapper(),
    });
    const { result: r2 } = renderHook(() => useFetchRuleTags({ search: 'sta' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(r1.current.data).toEqual(['prod']);
      expect(r2.current.data).toEqual(['staging']);
    });
  });
});
