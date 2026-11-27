/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { createFixtureUnitStatsClient } from '../../services/unit_stats_client/fixture_unit_stats_client';
import type { UnitStatsClient } from '../../services/unit_stats_client/types';
import { useDestinationFailures } from './use_destination_failures';

const mockUseStreamsAppFetch = jest.fn();
const mockCreateUnitStatsClient = jest.fn();

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: { start: { streams: { streamsRepositoryClient: { fetch: jest.fn() } } } },
  }),
}));
jest.mock('../../hooks/use_unit_id', () => ({ useUnitId: () => 'unit-001' }));
jest.mock('../../hooks/use_streams_app_fetch', () => ({
  useStreamsAppFetch: (...args: unknown[]) => mockUseStreamsAppFetch(...args),
}));
jest.mock('../../services/unit_stats_client/unit_stats_client', () => ({
  createUnitStatsClient: (...args: unknown[]) => mockCreateUnitStatsClient(...args),
}));

const START = Date.parse('2026-11-16T19:00:00.000Z');
const END = Date.parse('2026-11-16T20:00:00.000Z');

/** The function that the hook gives to the fetch, run as the fetch would run it. */
const runFetch = async (
  client: UnitStatsClient,
  destinationId = 'es-dev',
  options?: Parameters<typeof useDestinationFailures>[1]
) => {
  mockCreateUnitStatsClient.mockReturnValue(client);
  renderHook(() => useDestinationFailures(destinationId, options));
  const [fetchFn] = mockUseStreamsAppFetch.mock.calls[0];
  const signal = new AbortController().signal;
  return fetchFn({ signal, timeState: { start: START, end: END } });
};

describe('useDestinationFailures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStreamsAppFetch.mockReturnValue({ value: undefined, loading: false });
  });

  it('asks for the one destination, with its delivery series, over the range of the time picker', async () => {
    const client: UnitStatsClient = {
      fetchStats: jest.fn(createFixtureUnitStatsClient({ scenario: 'authFailures' }).fetchStats),
    };

    await runFetch(client);

    expect(client.fetchStats).toHaveBeenCalledWith(
      {
        components: [{ kind: 'destination', id: 'es-dev', include: { delivery_series: true } }],
        window: {
          kind: 'range',
          start: '2026-11-16T19:00:00.000Z',
          end: '2026-11-16T20:00:00.000Z',
        },
      },
      { signal: expect.any(AbortSignal) }
    );
  });

  it('asks over the window that the Map uses, with no range, when told to', async () => {
    const client: UnitStatsClient = {
      fetchStats: jest.fn(createFixtureUnitStatsClient({ scenario: 'authFailures' }).fetchStats),
    };

    await runFetch(client, 'es-dev', { range: 'default' });

    expect(client.fetchStats).toHaveBeenCalledWith(
      expect.objectContaining({ window: { kind: 'default' } }),
      { signal: expect.any(AbortSignal) }
    );
  });

  it('makes no request, and has no value, while it is not enabled', async () => {
    const client: UnitStatsClient = {
      fetchStats: jest.fn(createFixtureUnitStatsClient({ scenario: 'authFailures' }).fetchStats),
    };

    const result = await runFetch(client, 'es-dev', { enabled: false });

    expect(client.fetchStats).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('asks again when it becomes enabled, or when the range changes', () => {
    mockCreateUnitStatsClient.mockReturnValue(
      createFixtureUnitStatsClient({ scenario: 'authFailures' })
    );

    renderHook(() => useDestinationFailures('es-dev', { range: 'default', enabled: true }));

    const [, deps] = mockUseStreamsAppFetch.mock.calls[0];
    expect(deps).toEqual([expect.anything(), 'es-dev', 'default', true]);
  });

  it('gives the stats of that destination', async () => {
    const result = await runFetch(createFixtureUnitStatsClient({ scenario: 'authFailures' }));

    expect(result.status).toBe('ready');
    expect(result.stats.failed.authorization.percentage).toBe(45.2);
  });

  it('builds the client for the unit of the route', () => {
    mockCreateUnitStatsClient.mockReturnValue(
      createFixtureUnitStatsClient({ scenario: 'authFailures' })
    );

    renderHook(() => useDestinationFailures('es-dev'));

    expect(mockCreateUnitStatsClient).toHaveBeenCalledWith(
      expect.objectContaining({ unitId: 'unit-001' })
    );
  });

  it('shows no data for an id that the response does not have, and not a member of the prototype', async () => {
    const result = await runFetch(
      createFixtureUnitStatsClient({ scenario: 'authFailures' }),
      'constructor'
    );

    expect(result.status).toBe('noData');
    expect(result.stats.failed.authentication.percentage).toBeNull();
  });

  it('asks again when the range changes or the page is refreshed, and raises no toast', () => {
    mockCreateUnitStatsClient.mockReturnValue(
      createFixtureUnitStatsClient({ scenario: 'authFailures' })
    );

    renderHook(() => useDestinationFailures('es-dev'));

    const [, , options] = mockUseStreamsAppFetch.mock.calls[0];
    expect(options).toEqual({ withTimeRange: true, withRefresh: true, disableToastOnError: true });
  });
});
