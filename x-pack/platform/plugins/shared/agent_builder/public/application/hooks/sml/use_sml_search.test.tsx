/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useSmlSearch } from './use_sml_search';

const mockAddError = vi.fn();
const mockSearch = vi.fn();

vi.mock('../use_kibana', () => {
  const mocked = {
    useKibana: () => ({
      services: {
        notifications: {
          toasts: {
            addError: mockAddError,
          },
        },
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../use_agent_builder_service', () => {
  const mocked = {
    useAgentBuilderServices: () => ({
      smlService: { search: mockSearch },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/react-hooks', () => {
  const mocked = {
    useDebouncedValue: (value: string) => value,
  };
  return { ...mocked, default: mocked };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'UseSmlSearchTestWrapper';
  return Wrapper;
};

describe('useSmlSearch', () => {
  beforeEach(() => {
    mockAddError.mockClear();
    mockSearch.mockReset();
  });

  it('calls notifications.toasts.addError when the search query fails', async () => {
    const networkError = new Error('network');
    mockSearch.mockRejectedValue(networkError);

    renderHook(() => useSmlSearch(''), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledTimes(1);
    });

    const [errorArg, optionsArg] = mockAddError.mock.calls[0];
    expect(errorArg).toBe(networkError);
    expect(optionsArg).toEqual({
      title: 'Unable to load semantic knowledge',
    });
  });
});
