/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useFetchTags } from './use_fetch_tags';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { ActionPoliciesApi } from '../services/action_policies_api';

jest.mock('@kbn/core-di-browser');
jest.mock('../services/action_policies_api');

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

describe('useFetchTags', () => {
  const mockFetchTags = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart.mockImplementation((key: string) => key as any);
    mockUseService.mockImplementation((service: unknown) => {
      if (service === ActionPoliciesApi) {
        return { fetchTags: mockFetchTags } as any;
      }
      return undefined as any;
    });
  });

  it('unwraps the wrapped { tags } response', async () => {
    mockFetchTags.mockResolvedValue({ tags: ['production', 'staging'] });

    const { result } = renderHook(() => useFetchTags(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data).toEqual(['production', 'staging']);
    });
  });

  it('forwards search to fetchTags', async () => {
    mockFetchTags.mockResolvedValue({ tags: ['production'] });

    const { result } = renderHook(() => useFetchTags({ search: 'pro' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetchTags).toHaveBeenCalledWith(expect.objectContaining({ search: 'pro' }));
  });

  it('uses separate cache entries for different search prefixes', async () => {
    mockFetchTags
      .mockResolvedValueOnce({ tags: ['prod'] })
      .mockResolvedValueOnce({ tags: ['staging'] });

    const { result: r1 } = renderHook(() => useFetchTags({ search: 'pro' }), {
      wrapper: createWrapper(),
    });
    const { result: r2 } = renderHook(() => useFetchTags({ search: 'sta' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(r1.current.data).toEqual(['prod']);
      expect(r2.current.data).toEqual(['staging']);
    });
  });
});
