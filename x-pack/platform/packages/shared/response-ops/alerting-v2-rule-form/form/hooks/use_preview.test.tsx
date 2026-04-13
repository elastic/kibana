/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { getESQLResults } from '@kbn/esql-utils';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { RuleFormProvider, type RuleFormServices } from '../contexts';
import { createMockServices } from '../../test_utils';
import { usePreview, type UsePreviewParams } from './use_preview';

jest.mock('@kbn/esql-utils');

let mockUseDebouncedValue: jest.Mock;

jest.mock('@kbn/react-hooks', () => ({
  useDebouncedValue: (...args: unknown[]) => mockUseDebouncedValue(...args),
}));

const mockGetESQLResults = jest.mocked(getESQLResults);

const mockESQLResponse = {
  response: {
    columns: [
      { name: '@timestamp', type: 'date' },
      { name: 'message', type: 'keyword' },
    ],
    values: [
      ['2024-01-01T00:00:00Z', 'Error occurred'],
      ['2024-01-01T00:01:00Z', 'Warning issued'],
    ],
  },
};

const createServices = (): RuleFormServices => createMockServices();

const createWrapper = (services: RuleFormServices = createServices()) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <RuleFormProvider services={services} meta={{ layout: 'page' }}>
        {children}
      </RuleFormProvider>
    </QueryClientProvider>
  );
};

const defaultParams: UsePreviewParams = {
  query: 'FROM logs-* | LIMIT 100',
  timeField: '@timestamp',
  lookback: '1m',
  groupingFields: [],
};

describe('usePreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetESQLResults.mockResolvedValue(mockESQLResponse as any);
    // Default: no debounce delay (pass value straight through)
    mockUseDebouncedValue = jest.fn((value: unknown) => value);
  });

  describe('debouncing', () => {
    it('reports isLoading while the debounce timer is pending', () => {
      // Simulate debounce in-flight: return stale value while query has changed
      mockUseDebouncedValue = jest.fn(() => '');

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePreview(defaultParams), { wrapper });

      // query is non-empty but debouncedQuery is still '' → isDebouncing is true
      expect(result.current.isLoading).toBe(true);
    });

    it('does not execute the query while debounce is pending', () => {
      // Debounced value hasn't settled yet
      mockUseDebouncedValue = jest.fn(() => '');

      const wrapper = createWrapper();
      renderHook(() => usePreview(defaultParams), { wrapper });

      expect(mockGetESQLResults).not.toHaveBeenCalled();
    });

    it('executes the query once debounce settles', async () => {
      // Debounce returns the current value (settled)
      mockUseDebouncedValue = jest.fn((value: unknown) => value);

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePreview(defaultParams), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetESQLResults).toHaveBeenCalledTimes(1);
      expect(result.current.columns).toHaveLength(2);
      expect(result.current.rows).toHaveLength(2);
    });

    it('keeps previous results visible while debounce is pending after initial load', async () => {
      // Start with debounce settled
      mockUseDebouncedValue = jest.fn((value: unknown) => value);

      const wrapper = createWrapper();
      const { result, rerender } = renderHook((props: UsePreviewParams) => usePreview(props), {
        wrapper,
        initialProps: defaultParams,
      });

      // Wait for initial query to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.rows).toHaveLength(2);

      // Now simulate the user typing a new query (debounce returns old value)
      mockUseDebouncedValue = jest.fn(() => defaultParams.query);
      rerender({ ...defaultParams, query: 'FROM logs-* | LIMIT 50' });

      // isLoading should be true (debounce pending)
      expect(result.current.isLoading).toBe(true);
      // Previous results should still be visible (keepPreviousData)
      expect(result.current.rows).toHaveLength(2);
    });
  });
});
