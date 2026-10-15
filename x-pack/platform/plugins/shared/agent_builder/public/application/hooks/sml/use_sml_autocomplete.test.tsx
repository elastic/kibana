/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { SmlSearchFilterType } from '@kbn/agent-builder-sml-plugin/public';
import { SML_SEARCH_DEFAULT_SIZE } from '../../../services/sml/constants';
import { useSmlAutocomplete } from './use_sml_autocomplete';

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
    smlService: { autocomplete: mockAutocomplete },
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
  Wrapper.displayName = 'UseSmlAutocompleteTestWrapper';
  return Wrapper;
};

describe('useSmlAutocomplete', () => {
  beforeEach(() => {
    mockAddError.mockClear();
    mockAutocomplete.mockReset();
  });

  it('forwards the normalized query and constraints into the autocomplete call', async () => {
    mockAutocomplete.mockResolvedValue({ results: [] });
    const constraints = { [SmlSearchFilterType.connector]: { ids: ['gh-1'] } };

    renderHook(() => useSmlAutocomplete('git', { constraints }), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockAutocomplete).toHaveBeenCalledTimes(1);
    });

    expect(mockAutocomplete).toHaveBeenCalledWith({
      query: 'git',
      size: SML_SEARCH_DEFAULT_SIZE,
      constraints,
    });
  });

  it('keeps showing the previous results while a newer query is still loading', async () => {
    const firstResults = [{ id: 'wd-1', type: 'connector', title: 'workday' }];
    const secondResults = [{ id: 'wd-2', type: 'connector', title: 'workday_2' }];
    let resolveSecond: (value: { results: typeof secondResults }) => void = () => {};
    const secondPromise = new Promise<{ results: typeof secondResults }>((resolve) => {
      resolveSecond = resolve;
    });

    mockAutocomplete
      .mockResolvedValueOnce({ results: firstResults })
      .mockImplementationOnce(() => secondPromise);

    const { result, rerender } = renderHook(({ query }) => useSmlAutocomplete(query), {
      wrapper: createWrapper(),
      initialProps: { query: 'workda' },
    });

    await waitFor(() => {
      expect(result.current.results).toEqual(firstResults);
    });

    rerender({ query: 'workday' });

    // Second query still in flight; results must not flash to `[]`.
    expect(result.current.results).toEqual(firstResults);

    resolveSecond({ results: secondResults });

    await waitFor(() => {
      expect(result.current.results).toEqual(secondResults);
    });
  });

  it('surfaces failures via notifications.toasts.addError', async () => {
    const networkError = new Error('network');
    mockAutocomplete.mockRejectedValue(networkError);

    renderHook(() => useSmlAutocomplete('git'), { wrapper: createWrapper() });

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
