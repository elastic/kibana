/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

const mockAddError = jest.fn();
const mockRemove = jest.fn();
const mockPost = jest.fn();

jest.mock('../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      http: { post: mockPost },
      executionContext: { get: jest.fn() },
      notifications: {
        toasts: {
          addError: mockAddError,
          remove: mockRemove,
        },
      },
    },
  }),
}));

import { useCreateLiveQuery } from './use_create_live_query_action';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return Wrapper;
};

describe('useCreateLiveQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls setErrorToast with Forbidden error when API returns 403', async () => {
    const forbiddenError = {
      body: {
        error: 'Forbidden',
        message: 'User is not authorized to create/update osquery response action',
      },
    };
    mockPost.mockRejectedValueOnce(forbiddenError);

    const { result } = renderHook(() => useCreateLiveQuery({ onSuccess: jest.fn() }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        query: 'select * from processes limit 10;',
        agentSelection: {
          allAgentsSelected: true,
          agents: [],
          platformsSelected: [],
          policiesSelected: [],
        },
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockAddError).toHaveBeenCalledWith(
      forbiddenError,
      expect.objectContaining({
        title: 'Forbidden',
        toastMessage: 'User is not authorized to create/update osquery response action',
      })
    );
  });

  it('calls onSuccess and clears error toast on successful creation', async () => {
    const onSuccess = jest.fn();
    const mockResponse = {
      data: { action_id: 'test-123', queries: [], agents: [] },
    };
    mockPost.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useCreateLiveQuery({ onSuccess }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        query: 'select * from uptime;',
        agentSelection: {
          allAgentsSelected: true,
          agents: [],
          platformsSelected: [],
          policiesSelected: [],
        },
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalled();
  });
});
