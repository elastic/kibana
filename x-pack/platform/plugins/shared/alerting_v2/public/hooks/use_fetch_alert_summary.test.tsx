/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { AlertSummaryApi } from '../services/alert_summary_api';
import { useFetchAlertSummary } from './use_fetch_alert_summary';
import { alertSummaryKeys } from './query_key_factory';

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

const createWrapper = (
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useFetchAlertSummary', () => {
  const mockGetAlertSummary = jest.fn();
  const mockAddDanger = jest.fn();

  const response = {
    activeEventCount: 4,
    recoveredEventCount: 2,
    activeSeries: [{ key: 1, key_as_string: '1970', doc_count: 4 }],
    recoveredSeries: [{ key: 1, key_as_string: '1970', doc_count: 2 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart.mockImplementation((key: string) => key as any);
    mockUseService.mockImplementation((service: unknown) => {
      if (service === AlertSummaryApi) {
        return { getAlertSummary: mockGetAlertSummary } as any;
      }
      if (service === 'notifications') {
        return { toasts: { addDanger: mockAddDanger } } as any;
      }
      return undefined as any;
    });
  });

  it('calls the API with sorted ruleIds and returns data', async () => {
    mockGetAlertSummary.mockResolvedValue(response);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        useFetchAlertSummary({
          ruleIds: ['b', 'a', 'c'],
          gte: '2025-01-01T00:00:00.000Z',
          lte: '2025-01-02T00:00:00.000Z',
          fixedInterval: '1 hour',
        }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetAlertSummary).toHaveBeenCalledTimes(1);
    expect(mockGetAlertSummary).toHaveBeenCalledWith(
      {
        ruleIds: ['a', 'b', 'c'],
        gte: '2025-01-01T00:00:00.000Z',
        lte: '2025-01-02T00:00:00.000Z',
        fixed_interval: '1 hour',
      },
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(result.current.data).toEqual(response);
  });

  it('produces a stable cache key regardless of ruleId order', async () => {
    mockGetAlertSummary.mockResolvedValue(response);
    const { Wrapper, queryClient } = createWrapper(
      new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      })
    );

    const params = {
      gte: '2025-01-01T00:00:00.000Z',
      lte: '2025-01-02T00:00:00.000Z',
      fixedInterval: '1 hour',
    };

    const first = renderHook(() => useFetchAlertSummary({ ...params, ruleIds: ['a', 'b'] }), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    const second = renderHook(() => useFetchAlertSummary({ ...params, ruleIds: ['b', 'a'] }), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));

    const expectedKey = alertSummaryKeys.query({
      ruleIds: ['a', 'b'],
      gte: params.gte,
      lte: params.lte,
      fixed_interval: params.fixedInterval,
    });
    expect(queryClient.getQueryData(expectedKey)).toEqual(response);
    expect(mockGetAlertSummary).toHaveBeenCalledTimes(1);
  });

  it('does not call the API when disabled', async () => {
    mockGetAlertSummary.mockResolvedValue(response);
    const { Wrapper } = createWrapper();

    renderHook(
      () =>
        useFetchAlertSummary({
          ruleIds: ['a'],
          gte: 'x',
          lte: 'y',
          fixedInterval: '1 hour',
          enabled: false,
        }),
      { wrapper: Wrapper }
    );

    await new Promise((r) => setTimeout(r, 10));
    expect(mockGetAlertSummary).not.toHaveBeenCalled();
  });

  it('shows a danger toast when the API rejects', async () => {
    mockGetAlertSummary.mockRejectedValue(new Error('boom'));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        useFetchAlertSummary({
          ruleIds: ['a'],
          gte: 'x',
          lte: 'y',
          fixedInterval: '1 hour',
        }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockAddDanger).toHaveBeenCalledWith(expect.any(String));
  });
});
