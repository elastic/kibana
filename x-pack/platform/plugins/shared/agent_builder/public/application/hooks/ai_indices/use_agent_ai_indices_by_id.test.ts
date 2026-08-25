/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useAgentAiIndicesById } from './use_agent_ai_indices_by_id';

const mockAddErrorToast = jest.fn();
const mockGetAgentAiIndices = jest.fn();

jest.mock('@kbn/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    agentService: {
      getAgentAiIndices: mockGetAgentAiIndices,
    },
  }),
}));

jest.mock('../use_toasts', () => ({
  useToasts: () => ({
    addErrorToast: mockAddErrorToast,
  }),
}));

jest.mock('@kbn/agent-builder-browser', () => ({
  formatAgentBuilderErrorMessage: (error: Error) => error.message,
}));

const { useQuery } = jest.requireMock('@kbn/react-query');

describe('useAgentAiIndicesById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an error toast when the request fails', async () => {
    useQuery.mockImplementation((options: { onError?: (error: Error) => void }) => {
      options.onError?.(new Error('boom'));
      return {
        data: undefined,
        isLoading: false,
        error: new Error('boom'),
        isError: true,
      };
    });

    renderHook(() => useAgentAiIndicesById('chat-agent'));

    await waitFor(() => {
      expect(mockAddErrorToast).toHaveBeenCalledWith({
        title: 'Failed to fetch default AI indices',
        text: 'boom',
      });
    });
  });

  it('does not show a toast when the query is disabled', () => {
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
      isError: true,
    });

    renderHook(() => useAgentAiIndicesById('chat-agent', { enabled: false }));

    expect(mockAddErrorToast).not.toHaveBeenCalled();
  });

  it('does not fetch when the agent id is missing', () => {
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
      isError: false,
    });

    renderHook(() => useAgentAiIndicesById(undefined));

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('returns the effective AI indices for the agent', () => {
    useQuery.mockReturnValue({
      data: {
        ai_indices: [
          { id: 'elastic', is_default: true },
          { id: 'sales', is_default: false },
        ],
      },
      isLoading: false,
      error: undefined,
      isError: false,
    });

    const { result } = renderHook(() => useAgentAiIndicesById('chat-agent'));

    expect(result.current.aiIndices).toEqual([
      { id: 'elastic', is_default: true },
      { id: 'sales', is_default: false },
    ]);
    expect(result.current.warnings).toBeUndefined();
  });

  it('returns response warnings', () => {
    useQuery.mockReturnValue({
      data: {
        ai_indices: [{ id: 'my-index', is_default: false }],
        warnings: [
          {
            message: 'boom',
            agent_type: 'chat',
          },
        ],
      },
      isLoading: false,
      error: undefined,
      isError: false,
    });

    const { result } = renderHook(() => useAgentAiIndicesById('chat-agent'));

    expect(result.current.warnings).toEqual([
      {
        message: 'boom',
        agent_type: 'chat',
      },
    ]);
  });
});
