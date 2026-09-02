/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useListAiIndices } from './use_list_ai_indices';

const mockAddErrorToast = jest.fn();

jest.mock('@kbn/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: {
        get: jest.fn(),
      },
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

describe('useListAiIndices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an error toast when the list request fails', async () => {
    useQuery.mockImplementation((options: { onError?: (error: Error) => void }) => {
      options.onError?.(new Error('boom'));
      return {
        data: undefined,
        isLoading: false,
        error: new Error('boom'),
        isError: true,
      };
    });

    renderHook(() => useListAiIndices());

    await waitFor(() => {
      expect(mockAddErrorToast).toHaveBeenCalledWith({
        title: 'Failed to fetch AI indices',
        text: 'boom',
      });
    });
  });

  it('does not show a toast while the list is loading', () => {
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      isError: false,
    });

    renderHook(() => useListAiIndices());

    expect(mockAddErrorToast).not.toHaveBeenCalled();
  });
});
