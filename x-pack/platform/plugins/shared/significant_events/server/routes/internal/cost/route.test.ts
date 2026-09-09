/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { FEATURE_ID_TO_COST_BUDGET_GROUP } from '../../../../common/cost';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import type { SignificantEventsServer } from '../../../types';
import type { PriceResult, PriceService } from '../../../lib/cost/price_service';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { assertCanManageRunQuotas } from '../../../lib/run_quotas';
import { resolveTokenTrackingCoverage } from '../../../lib/cost/token_tracking_coverage';
import { internalCostRoutes, resetCostRouteCache } from './route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../lib/run_quotas', () => ({
  ...jest.requireActual('../../../lib/run_quotas'),
  assertCanManageRunQuotas: jest.fn(),
}));

jest.mock('../../../lib/cost/token_tracking_coverage', () => ({
  resolveTokenTrackingCoverage: jest.fn(),
}));

const route = internalCostRoutes['GET /internal/significant_events/cost'];

const PRICE_RESULT: PriceResult = {
  prices: new Map([
    [
      'anthropic-claude-4.6-sonnet',
      { input: 4.5, output: 21, cacheRead: 0.45, tierThreshold: null },
    ],
  ]),
  fetchedAt: '2026-09-09T06:00:00.000Z',
  stale: false,
};

const emptySearch = {
  aggregations: {
    total_tokens: { value: 0 },
    feature_buckets: {
      buckets: Object.fromEntries(
        Object.keys(FEATURE_ID_TO_COST_BUDGET_GROUP).map((featureId) => [
          featureId,
          {
            doc_count: 0,
            feature_total_tokens: { value: 0 },
            models: { buckets: [], sum_other_doc_count: 0 },
            missing_model: { doc_count: 0, total_tokens: { value: 0 } },
          },
        ])
      ),
    },
    unknown_features: { doc_count: 0, total_tokens: { value: 0 } },
  },
};

const search = jest.fn();
const getPrices = jest.fn<Promise<PriceResult | null>, []>();
const priceService: PriceService = { getPrices };

const server = {
  logger: loggerMock.create(),
  core: {
    elasticsearch: {
      client: {
        asInternalUser: { search },
      },
    },
  },
} as unknown as SignificantEventsServer;

const request = {};
const getScopedClients = jest.fn().mockResolvedValue({ licensing: {} });

const handlerParams = {
  request,
  server,
  getScopedClients,
  priceService,
};

const invoke = (query?: { refresh?: boolean }) =>
  route.handler({
    ...handlerParams,
    params: { query },
  } as never);

describe('Significant Events cost route', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-09T08:30:00.000Z'));
    resetCostRouteCache();
    search.mockReset().mockResolvedValue(emptySearch);
    getPrices.mockReset().mockResolvedValue(PRICE_RESULT);
    getScopedClients.mockClear();
    jest.mocked(assertSignificantEventsAccess).mockReset().mockResolvedValue(undefined);
    jest.mocked(assertCanManageRunQuotas).mockReset().mockResolvedValue(undefined);
    jest.mocked(resolveTokenTrackingCoverage).mockReset().mockResolvedValue({
      status: 'partial',
      enabledSpaceCount: 1,
      totalSpaceCount: 2,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('requires Streams manage and runs both access assertions', async () => {
    expect(route.security.authz).toEqual({
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    });
    await invoke();
    expect(assertSignificantEventsAccess).toHaveBeenCalledWith({
      server,
      licensing: {},
    });
    expect(assertCanManageRunQuotas).toHaveBeenCalledWith({ request, server });
  });

  it('does not calculate cost when an assertion fails', async () => {
    jest.mocked(assertCanManageRunQuotas).mockRejectedValue(new Error('forbidden'));
    await expect(invoke()).rejects.toThrow('forbidden');
    expect(getPrices).not.toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
  });

  it('runs both authorization checks before serving a cached response', async () => {
    await invoke();

    jest
      .mocked(assertSignificantEventsAccess)
      .mockRejectedValueOnce(new Error('significant events forbidden'));
    await expect(invoke()).rejects.toThrow('significant events forbidden');

    jest.mocked(assertCanManageRunQuotas).mockRejectedValueOnce(new Error('quota forbidden'));
    await expect(invoke()).rejects.toThrow('quota forbidden');

    expect(getPrices).toHaveBeenCalledTimes(1);
  });

  it('accepts boolean and string refresh query values and rejects others', () => {
    expect(route.params.safeParse({ query: { refresh: true } }).success).toBe(true);
    expect(route.params.safeParse({ query: { refresh: false } }).success).toBe(true);
    expect(route.params.safeParse({ query: { refresh: 'true' } }).success).toBe(true);
    expect(route.params.safeParse({ query: { refresh: 'false' } }).success).toBe(true);
    expect(route.params.safeParse({ query: {} }).success).toBe(true);
    expect(route.params.safeParse({}).success).toBe(true);
    expect(route.params.safeParse({ query: { refresh: 'yes' } }).success).toBe(false);
  });

  it('returns the normal available response contract', async () => {
    const response = await invoke();
    expect(response.unavailableReason).toBeNull();
    expect(response.pricesFetchedAt).toBe(PRICE_RESULT.fetchedAt);
    expect(response.pricesStale).toBe(false);
    expect(response.trackingCoverage).toEqual({
      status: 'partial',
      enabledSpaceCount: 1,
      totalSpaceCount: 2,
    });
  });

  it('returns the cached object within 60 seconds and recalculates after expiry', async () => {
    const first = await invoke();
    const second = await invoke();
    expect(second).toEqual(first);
    expect(getPrices).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60_000);
    const third = await invoke();
    expect(getPrices).toHaveBeenCalledTimes(2);
    expect(third.asOf).not.toBe(first.asOf);
  });

  it('recalculates on refresh=true and replaces the cache', async () => {
    await invoke();
    getPrices.mockResolvedValueOnce({
      ...PRICE_RESULT,
      fetchedAt: '2026-09-09T06:05:00.000Z',
    });
    const refreshed = await invoke({ refresh: true });
    expect(getPrices).toHaveBeenCalledTimes(2);
    const cached = await invoke();
    expect(cached.pricesFetchedAt).toBe('2026-09-09T06:05:00.000Z');
    expect(cached).toEqual(refreshed);
    expect(getPrices).toHaveBeenCalledTimes(2);
  });

  it('returns structured pricing unavailable and does not cache it', async () => {
    getPrices.mockResolvedValue(null);
    const first = await invoke();
    expect(first.unavailableReason).toBe('pricing');
    expect(first.pricesFetchedAt).toBeNull();
    expect(first.pricesStale).toBe(false);
    expect(search).not.toHaveBeenCalled();
    await invoke();
    expect(getPrices).toHaveBeenCalledTimes(2);
  });

  it('returns structured usage-data unavailable and does not cache it', async () => {
    search.mockRejectedValue(new Error('search failed'));
    const first = await invoke();
    expect(first.unavailableReason).toBe('usage_data');
    expect(first.pricesFetchedAt).toBe(PRICE_RESULT.fetchedAt);
    await invoke();
    expect(getPrices).toHaveBeenCalledTimes(2);
  });

  it('preserves the last successful cache entry when a forced pricing refresh fails', async () => {
    const successful = await invoke();
    getPrices.mockResolvedValueOnce(null);

    const failedRefresh = await invoke({ refresh: true });
    expect(failedRefresh.unavailableReason).toBe('pricing');

    const cached = await invoke();
    expect(cached).toEqual(successful);
    expect(cached.unavailableReason).toBeNull();
    expect(getPrices).toHaveBeenCalledTimes(2);
  });

  it('preserves the last successful cache entry when a forced usage refresh fails', async () => {
    const successful = await invoke();
    search.mockRejectedValueOnce(new Error('search failed'));

    const failedRefresh = await invoke({ refresh: true });
    expect(failedRefresh.unavailableReason).toBe('usage_data');

    const cached = await invoke();
    expect(cached).toEqual(successful);
    expect(cached.unavailableReason).toBeNull();
    expect(getPrices).toHaveBeenCalledTimes(2);
  });

  it('caches the successful response when the token usage index is missing', async () => {
    search.mockRejectedValue(
      Object.assign(new Error('no such index'), {
        statusCode: 404,
        body: { error: { type: 'index_not_found_exception' } },
      })
    );
    const response = await invoke();
    expect(response.unavailableReason).toBeNull();
    await invoke();
    expect(getPrices).toHaveBeenCalledTimes(1);
  });

  it('clears a rejected normal request so the next request can recover', async () => {
    getPrices.mockRejectedValueOnce(new Error('price boom'));
    await expect(invoke()).rejects.toThrow('price boom');
    const recovered = await invoke();
    expect(recovered.unavailableReason).toBeNull();
    expect(getPrices).toHaveBeenCalledTimes(2);
  });

  it('returns cost with a caveat when tracking coverage cannot be resolved', async () => {
    jest.mocked(resolveTokenTrackingCoverage).mockResolvedValue({
      status: 'unavailable',
      enabledSpaceCount: null,
      totalSpaceCount: null,
    });
    const response = await invoke();
    expect(response.unavailableReason).toBeNull();
    expect(response.trackingCoverage.status).toBe('unavailable');
    expect(response.caveats).toContain('tracking_not_all_spaces');
  });
});
