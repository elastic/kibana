/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { CeSearchFilterType } from '@kbn/context-engine-plugin/public';
import { CE_SEARCH_DEFAULT_SIZE } from '../../../services/ce/constants';
import { useCeAutocomplete } from './use_ce_autocomplete';

const mockAddError = jest.fn();
const mockAutocomplete = jest.fn();

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
    ceService: { autocomplete: mockAutocomplete },
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
  Wrapper.displayName = 'UseCeAutocompleteTestWrapper';
  return Wrapper;
};

describe('useCeAutocomplete', () => {
  beforeEach(() => {
    mockAddError.mockClear();
    mockAutocomplete.mockReset();
  });

  it('forwards the normalized query and constraints into the autocomplete call', async () => {
    mockAutocomplete.mockResolvedValue({ results: [] });
    const constraints = { [CeSearchFilterType.connector]: { ids: ['gh-1'] } };

    renderHook(() => useCeAutocomplete('git', { constraints }), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockAutocomplete).toHaveBeenCalledTimes(1);
    });

    expect(mockAutocomplete).toHaveBeenCalledWith({
      query: 'git',
      size: CE_SEARCH_DEFAULT_SIZE,
      constraints,
    });
  });

  it('surfaces failures via notifications.toasts.addError', async () => {
    const networkError = new Error('network');
    mockAutocomplete.mockRejectedValue(networkError);

    renderHook(() => useCeAutocomplete('git'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledTimes(1);
    });

    const [errorArg, optionsArg] = mockAddError.mock.calls[0];
    expect(errorArg).toBe(networkError);
    expect(optionsArg).toEqual({
      title: 'Unable to load autocomplete suggestions',
    });
  });
});
