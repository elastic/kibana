/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { CostResponse, RunQuotasResponse } from '@kbn/significant-events-plugin/common';
import { useKibana } from './use_kibana';
import { useRunQuotas } from './use_significant_events_run_quotas';
import {
  SIGNIFICANT_EVENTS_COST_QUERY_KEY,
  useSignificantEventsCost,
} from './use_significant_events_cost';

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('./use_significant_events_run_quotas', () => ({
  useRunQuotas: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseRunQuotas = useRunQuotas as jest.MockedFunction<typeof useRunQuotas>;

const fetch = jest.fn();

const quotasResponse = (canManage: boolean): RunQuotasResponse => ({
  enabled: true,
  limits: { detection: 1, investigation: 1, ki_extraction: 1 },
  counts: { detection: 0, investigation: 0, ki_extraction: 0 },
  window: {
    start: '2026-09-09T00:00:00.000Z',
    resetsAt: '2026-09-10T00:00:00.000Z',
    timezone: 'UTC',
  },
  canManage,
});

const costResponse = (overrides: Partial<CostResponse> = {}): CostResponse => ({
  today: {
    label: 'today',
    periodStart: '2026-09-09T00:00:00.000Z',
    periodEnd: '2026-09-09T12:00:00.000Z',
    groups: [],
    totalEstimatedCost: 1.23,
    totalStatus: 'complete',
    totalTokens: 10,
    unknownFeatureTokens: 0,
    unknownFeatureDocCount: 0,
  },
  month: {
    label: 'this_month',
    periodStart: '2026-09-01T00:00:00.000Z',
    periodEnd: '2026-09-09T12:00:00.000Z',
    groups: [],
    totalEstimatedCost: 4.56,
    totalStatus: 'complete',
    totalTokens: 40,
    unknownFeatureTokens: 0,
    unknownFeatureDocCount: 0,
  },
  asOf: '2026-09-09T12:00:00.000Z',
  pricesFetchedAt: '2026-09-09T06:00:00.000Z',
  pricesStale: false,
  unavailableReason: null,
  caveats: [],
  ...overrides,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

describe('useSignificantEventsCost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      dependencies: {
        start: {
          significantEvents: { significantEventsRepositoryClient: { fetch } },
        },
      },
    } as never);
    mockUseRunQuotas.mockReturnValue({
      data: quotasResponse(true),
      isLoading: false,
      isError: false,
    } as never);
  });

  it('disables the cost query while run-quota privilege is unknown', async () => {
    mockUseRunQuotas.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as never);
    const { wrapper } = createWrapper();
    renderHook(() => useSignificantEventsCost({ enabled: true }), { wrapper });
    await act(async () => undefined);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('disables the cost query when canManage is false', async () => {
    mockUseRunQuotas.mockReturnValue({
      data: quotasResponse(false),
      isLoading: false,
      isError: false,
    } as never);
    const { wrapper } = createWrapper();
    renderHook(() => useSignificantEventsCost({ enabled: true }), { wrapper });
    await act(async () => undefined);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('disables the cost query when the tracking gate is false', async () => {
    const { wrapper } = createWrapper();
    renderHook(() => useSignificantEventsCost({ enabled: false }), { wrapper });
    await act(async () => undefined);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('omits refresh and passes the abort signal on the normal query', async () => {
    fetch.mockResolvedValue(costResponse());
    const { wrapper } = createWrapper();
    renderHook(() => useSignificantEventsCost({ enabled: true }), { wrapper });
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith('GET /internal/significant_events/cost', {
      signal: expect.any(AbortSignal),
    });
  });

  it('sends refresh=true, writes the result into the cost query, and does not invalidate', async () => {
    fetch
      .mockResolvedValueOnce(costResponse())
      .mockResolvedValueOnce(costResponse({ pricesFetchedAt: '2026-09-09T12:01:00.000Z' }));
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSignificantEventsCost({ enabled: true }), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    await act(async () => {
      await result.current.refreshCost();
    });

    expect(fetch).toHaveBeenLastCalledWith('GET /internal/significant_events/cost', {
      signal: null,
      params: { query: { refresh: true } },
    });
    expect(queryClient.getQueryData(SIGNIFICANT_EVENTS_COST_QUERY_KEY)).toEqual(
      costResponse({ pricesFetchedAt: '2026-09-09T12:01:00.000Z' })
    );
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('sets isRefreshing for the entire forced request', async () => {
    let resolveRefresh: (value: CostResponse) => void = () => undefined;
    fetch.mockResolvedValueOnce(costResponse()).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        })
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSignificantEventsCost({ enabled: true }), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    let refreshDone: Promise<void> | undefined;
    act(() => {
      refreshDone = result.current.refreshCost();
    });
    await waitFor(() => expect(result.current.isRefreshing).toBe(true));
    await act(async () => {
      resolveRefresh(costResponse());
      await refreshDone;
    });
    expect(result.current.isRefreshing).toBe(false);
  });

  it('returns a manual-refresh failure through error without an unhandled rejection', async () => {
    fetch.mockResolvedValueOnce(costResponse()).mockRejectedValueOnce(new Error('refresh failed'));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSignificantEventsCost({ enabled: true }), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    await act(async () => {
      await result.current.refreshCost();
    });
    expect(result.current.error).toEqual(new Error('refresh failed'));
  });

  it('retries with a normal React Query refetch', async () => {
    fetch.mockResolvedValue(costResponse());
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSignificantEventsCost({ enabled: true }), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    await act(async () => {
      await result.current.retryCost();
    });
    expect(fetch).toHaveBeenLastCalledWith('GET /internal/significant_events/cost', {
      signal: expect.any(AbortSignal),
    });
  });
});
