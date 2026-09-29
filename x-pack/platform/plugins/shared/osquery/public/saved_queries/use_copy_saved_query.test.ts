/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider, QueryClient } from '@kbn/react-query';
import { useKibana } from '../common/lib/kibana';
import { useCopySavedQuery } from './use_copy_saved_query';
import { SAVED_QUERIES_ID } from './constants';

vi.mock('../common/lib/kibana');

const useKibanaMock = useKibana as MockedFunction<typeof useKibana>;

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return Wrapper;
};

describe('useCopySavedQuery', () => {
  let mockHttp: { post: Mock };
  let mockToasts: { addSuccess: Mock; addError: Mock; remove: Mock };
  let mockNavigateToApp: Mock;
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttp = { post: vi.fn() };
    mockToasts = { addSuccess: vi.fn(), addError: vi.fn(), remove: vi.fn() };
    mockNavigateToApp = vi.fn();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      logger: { log: () => null, warn: () => null, error: () => null },
    });

    useKibanaMock.mockReturnValue({
      services: {
        application: { navigateToApp: mockNavigateToApp },
        http: mockHttp,
        notifications: { toasts: mockToasts },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('calls the copy API and navigates to the new saved query edit page on success', async () => {
    mockHttp.post.mockResolvedValue({
      data: { saved_object_id: 'new-sq-id', id: 'my-query_copy' },
    });

    const { result } = renderHook(() => useCopySavedQuery({ savedQueryId: 'source-sq-id' }), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockHttp.post).toHaveBeenCalledWith('/api/osquery/saved_queries/source-sq-id/copy', {
      version: '2023-10-31',
    });

    expect(mockNavigateToApp).toHaveBeenCalledWith('osquery', {
      path: '/saved_queries/new-sq-id',
    });

    expect(mockToasts.addSuccess).toHaveBeenCalledWith('Saved query duplicated successfully');
  });

  it('invalidates the saved queries cache on success', async () => {
    mockHttp.post.mockResolvedValue({
      data: { saved_object_id: 'new-sq-id', id: 'my-query_copy' },
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCopySavedQuery({ savedQueryId: 'source-sq-id' }), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(invalidateSpy).toHaveBeenCalledWith([SAVED_QUERIES_ID]);
  });

  it('shows an error toast on failure', async () => {
    const error = { body: { error: 'Not Found', message: 'Saved query not found' } };
    mockHttp.post.mockRejectedValue(error);

    const { result } = renderHook(() => useCopySavedQuery({ savedQueryId: 'bad-id' }), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync();
      } catch {
        // expected
      }
    });

    await waitFor(() => {
      expect(mockToasts.addError).toHaveBeenCalled();
    });

    expect(mockNavigateToApp).not.toHaveBeenCalled();
    expect(mockToasts.addSuccess).not.toHaveBeenCalled();
  });
});
