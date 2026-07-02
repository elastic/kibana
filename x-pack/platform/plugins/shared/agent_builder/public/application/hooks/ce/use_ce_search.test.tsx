/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useCeSearch } from './use_ce_search';

const mockAddError = jest.fn();
const mockSearch = jest.fn();

jest.mock('../use_kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: {
        toasts: {
          addError: mockAddError,
        },
      },
    },
  }),
}));

jest.mock('../use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    ceService: { search: mockSearch },
  }),
}));

jest.mock('@kbn/react-hooks', () => ({
  useDebouncedValue: (value: string) => value,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'UseCeSearchTestWrapper';
  return Wrapper;
};

describe('useCeSearch', () => {
  beforeEach(() => {
    mockAddError.mockClear();
    mockSearch.mockReset();
  });

  it('calls notifications.toasts.addError when the search query fails', async () => {
    const networkError = new Error('network');
    mockSearch.mockRejectedValue(networkError);

    renderHook(() => useCeSearch(''), { wrapper: createWrapper() });

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
