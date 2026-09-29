/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook, waitFor } from '@testing-library/react';
import { useListAiIndices } from './use_list_ai_indices';

const mockAddErrorToast = vi.fn();

vi.mock('@kbn/react-query', () => {
      const mocked = {
      useQuery: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../use_kibana', () => {
      const mocked = {
      useKibana: () => ({
        services: {
          http: {
            get: vi.fn(),
          },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../use_toasts', () => {
      const mocked = {
      useToasts: () => ({
        addErrorToast: mockAddErrorToast,
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/agent-builder-browser', () => {
      const mocked = {
      formatAgentBuilderErrorMessage: (error: Error) => error.message,
    };
      return { ...mocked, default: mocked };
    });

const { useQuery } = (await vi.importMock('@kbn/react-query'));

describe('useListAiIndices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        title: 'Failed to fetch AI Indices',
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
