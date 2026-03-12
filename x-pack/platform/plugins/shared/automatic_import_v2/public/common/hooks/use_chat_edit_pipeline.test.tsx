/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useChatEditPipeline } from './use_chat_edit_pipeline';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import * as api from '../lib/api';

jest.mock('../lib/api');
const mockChatEditPipeline = api.chatEditPipeline as jest.Mock;

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: {},
    },
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('useChatEditPipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useChatEditPipeline(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should call chatEditPipeline API on mutate', async () => {
    const mockResponse = {
      updatedPipeline: { processors: [] },
      explanation: 'Done.',
      validationResults: {
        success_rate: 100,
        successful_samples: 5,
        failed_samples: 0,
        total_samples: 5,
        failure_details: [],
      },
    };
    mockChatEditPipeline.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useChatEditPipeline(), {
      wrapper: createWrapper(),
    });

    const request = {
      integrationId: 'integration-123',
      dataStreamId: 'data-stream-456',
      connectorId: 'connector-789',
      currentPipeline: { processors: [] },
      userMessage: 'Add ECS mappings',
    };

    await act(async () => {
      await result.current.chatEditPipelineMutation.mutateAsync(request);
    });

    await waitFor(() => {
      expect(mockChatEditPipeline).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: 'integration-123',
          dataStreamId: 'data-stream-456',
          connectorId: 'connector-789',
          userMessage: 'Add ECS mappings',
        })
      );
    });
  });

  it('should handle errors', async () => {
    mockChatEditPipeline.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useChatEditPipeline(), {
      wrapper: createWrapper(),
    });

    const request = {
      integrationId: 'i1',
      dataStreamId: 'd1',
      connectorId: 'c1',
      currentPipeline: { processors: [] },
      userMessage: 'test',
    };

    await act(async () => {
      try {
        await result.current.chatEditPipelineMutation.mutateAsync(request);
      } catch {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe('Server error');
    });
  });
});
