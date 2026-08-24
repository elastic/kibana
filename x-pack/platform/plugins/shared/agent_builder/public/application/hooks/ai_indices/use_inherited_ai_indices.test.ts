/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useInheritedAiIndices } from './use_inherited_ai_indices';

const mockAddErrorToast = jest.fn();
const mockListBaseConfigurations = jest.fn();

jest.mock('@kbn/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    agentService: {
      listBaseConfigurations: mockListBaseConfigurations,
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

describe('useInheritedAiIndices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an error toast when the request fails', async () => {
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
      isError: true,
    });

    renderHook(() => useInheritedAiIndices());

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

    renderHook(() => useInheritedAiIndices({ enabled: false }));

    expect(mockAddErrorToast).not.toHaveBeenCalled();
  });
});
