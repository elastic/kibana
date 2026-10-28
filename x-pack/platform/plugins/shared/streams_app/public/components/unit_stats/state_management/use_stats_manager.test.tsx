/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, renderHook } from '@testing-library/react';
import { STATS_FIXTURE_RESPONSES } from '../../../services/unit_stats_client/fixture_unit_stats_client';
import { STATS_BATCH_DEBOUNCE_MS } from './constants';
import type { ProcessingNodeRef } from '../../../services/unit_graph';
import {
  StatsManagerProvider,
  useDestinationStats,
  useProcessorStats,
  useSlotStats,
  useStatsRefresh,
  useStatsUnitPersisted,
} from './use_stats_manager';

// The route client is the only thing that is faked. The provider, the stats client and the
// machine are the real ones.
const mockFetch = jest.fn();

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: { start: { streams: { streamsRepositoryClient: { fetch: mockFetch } } } },
  }),
}));

const UNIT_ID = 'unit-under-test';

const wrapper = ({ children }: React.PropsWithChildren<{}>) => (
  <StatsManagerProvider unitId={UNIT_ID}>{children}</StatsManagerProvider>
);

const advance = (ms: number) =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });

const signalOfCall = (call: number): AbortSignal => mockFetch.mock.calls[call][1].signal;

beforeEach(() => {
  jest.useFakeTimers();
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(STATS_FIXTURE_RESPONSES.data);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useDestinationStats', () => {
  it('is undefined until the first result arrives, then the destination stats', async () => {
    const { result } = renderHook(() => useDestinationStats('es-prod'), { wrapper });

    expect(result.current).toBeUndefined();

    await advance(STATS_BATCH_DEBOUNCE_MS);

    expect(result.current).toMatchObject({ status: 'ready', stats: { eventsRate: 3700 } });
  });

  it('asks the stats route of the unit for the component', async () => {
    renderHook(() => useDestinationStats('es-prod'), { wrapper });
    await advance(STATS_BATCH_DEBOUNCE_MS);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('POST /internal/streams/unit/{id}/_stats', {
      params: {
        path: { id: UNIT_ID },
        body: { components: [{ kind: 'destination', id: 'es-prod' }] },
      },
      signal: expect.any(AbortSignal),
    });
  });

  it('registers nothing and returns undefined without an id', async () => {
    const { result } = renderHook(() => useDestinationStats(undefined), { wrapper });
    await advance(STATS_BATCH_DEBOUNCE_MS * 5);

    expect(result.current).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('requests a component that two callers show once', async () => {
    const { result } = renderHook(
      () => ({ first: useDestinationStats('es-prod'), second: useDestinationStats('es-prod') }),
      { wrapper }
    );
    await advance(STATS_BATCH_DEBOUNCE_MS);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][1].params.body.components).toHaveLength(1);
    expect(result.current.first).toBe(result.current.second);
  });
});

describe('useProcessorStats', () => {
  it('returns every instance of the processor', async () => {
    const { result } = renderHook(() => useProcessorStats('uppercase-message'), { wrapper });
    await advance(STATS_BATCH_DEBOUNCE_MS);

    expect(result.current?.status).toBe('ready');
    expect(result.current?.stats?.instances).toHaveLength(3);
  });
});

describe('registration follows the caller', () => {
  const Probe = () => {
    useDestinationStats('es-prod');
    return null;
  };

  it('stops the request when the last caller unmounts, while the provider stays', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const { rerender } = render(
      <StatsManagerProvider unitId={UNIT_ID}>
        <Probe />
      </StatsManagerProvider>
    );
    await advance(STATS_BATCH_DEBOUNCE_MS);
    expect(signalOfCall(0).aborted).toBe(false);

    rerender(<StatsManagerProvider unitId={UNIT_ID}>{null}</StatsManagerProvider>);

    expect(signalOfCall(0).aborted).toBe(true);
  });

  it('stops the request when the provider unmounts', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const { unmount } = render(
      <StatsManagerProvider unitId={UNIT_ID}>
        <Probe />
      </StatsManagerProvider>
    );
    await advance(STATS_BATCH_DEBOUNCE_MS);

    unmount();

    expect(signalOfCall(0).aborted).toBe(true);
  });
});

describe('renders', () => {
  const renderProbeAndRefresher = () => {
    const renders = { count: 0 };
    const refresher: { refresh: () => void } = { refresh: () => {} };

    const Probe = () => {
      renders.count += 1;
      useDestinationStats('es-prod');
      return null;
    };
    const Refresher = () => {
      refresher.refresh = useStatsRefresh().refresh;
      return null;
    };

    render(
      <StatsManagerProvider unitId={UNIT_ID}>
        <Probe />
        <Refresher />
      </StatsManagerProvider>
    );

    return { renders, refresher };
  };

  it('does not re-render a caller when a refresh returns equal values', async () => {
    const { renders, refresher } = renderProbeAndRefresher();
    await advance(STATS_BATCH_DEBOUNCE_MS);
    const rendersAfterFirstResult = renders.count;

    act(() => refresher.refresh());
    await advance(0);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(renders.count).toBe(rendersAfterFirstResult);
  });

  it('re-renders a caller when a refresh returns different values', async () => {
    const { renders, refresher } = renderProbeAndRefresher();
    await advance(STATS_BATCH_DEBOUNCE_MS);
    const rendersAfterFirstResult = renders.count;

    mockFetch.mockResolvedValue(STATS_FIXTURE_RESPONSES.noData);
    act(() => refresher.refresh());
    await advance(0);

    expect(renders.count).toBeGreaterThan(rendersAfterFirstResult);
  });
});

describe('useStatsRefresh', () => {
  it('reports that a refresh is running, and when the last result arrived', async () => {
    let resolveFetch: (response: unknown) => void = () => {};
    const { result } = renderHook(
      () => ({ stats: useDestinationStats('es-prod'), refresh: useStatsRefresh() }),
      { wrapper }
    );
    await advance(STATS_BATCH_DEBOUNCE_MS);
    expect(result.current.refresh.isRefreshing).toBe(false);
    expect(result.current.refresh.lastUpdated).toBeDefined();

    mockFetch.mockImplementation(() => new Promise((resolve) => (resolveFetch = resolve)));
    act(() => result.current.refresh.refresh());
    expect(result.current.refresh.isRefreshing).toBe(true);

    await act(async () => resolveFetch(STATS_FIXTURE_RESPONSES.data));
    expect(result.current.refresh.isRefreshing).toBe(false);
  });
});

describe('useStatsUnitPersisted', () => {
  it('drops the components that are no longer in the saved unit', async () => {
    const { result } = renderHook(
      () => ({ stats: useDestinationStats('es-prod'), persisted: useStatsUnitPersisted() }),
      { wrapper }
    );
    await advance(STATS_BATCH_DEBOUNCE_MS);
    expect(result.current.stats?.status).toBe('ready');

    act(() => result.current.persisted([]));

    expect(result.current.stats).toBeUndefined();
  });
});

describe('useSlotStats', () => {
  const ROUTE_SLOT: ProcessingNodeRef = { kind: 'route', pipelineId: 'main', routeIndex: 0 };
  const PIPELINE_SLOT: ProcessingNodeRef = { kind: 'pipeline', pipelineId: 'main' };

  const rawInstance = (
    pipelineId: string,
    routeIndex: number | null,
    rate: number | null,
    duration: number | null
  ) => ({
    pipeline_id: pipelineId,
    route_index: routeIndex,
    processing_duration: { average: { value: duration, unit: 's' } },
    events: {
      incoming: { rate: { value: rate, unit: '{item}', time_unit: 's' } },
      failed: { rate: { value: null, unit: '{item}', time_unit: 's' } },
    },
  });

  /** A raw response with the given processors, each with the given instances. */
  const responseWith = (processors: Record<string, Array<ReturnType<typeof rawInstance>>>) => ({
    components: {
      destinations: {},
      processors: Object.fromEntries(
        Object.entries(processors).map(([id, instances]) => [id, { instances }])
      ),
    },
    meta: { window: { start: '2026-10-27T12:00:00.000Z', end: '2026-10-27T12:15:00.000Z' } },
  });

  const TWO_PROCESSORS = responseWith({
    parse: [rawInstance('main', 0, 1000, 0.002)],
    enrich: [rawInstance('main', 0, 400, 0.006)],
  });

  it('is unknown until the results arrive, then takes the first rate and adds up the times', async () => {
    mockFetch.mockResolvedValue(TWO_PROCESSORS);
    const { result } = renderHook(
      () => useSlotStats({ ref: ROUTE_SLOT, processorIds: ['parse', 'enrich'] }),
      { wrapper }
    );

    expect(result.current.status).toBe('unknown');

    await advance(STATS_BATCH_DEBOUNCE_MS);

    expect(result.current.status).toBe('ready');
    expect(result.current.eventsRate).toBe(1000);
    expect(result.current.durationAverage).toBeCloseTo(0.008);
  });

  it('requests all the processors of the slot in one call', async () => {
    mockFetch.mockResolvedValue(TWO_PROCESSORS);
    renderHook(() => useSlotStats({ ref: ROUTE_SLOT, processorIds: ['parse', 'enrich'] }), {
      wrapper,
    });
    await advance(STATS_BATCH_DEBOUNCE_MS);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][1].params.body.components).toEqual([
      { kind: 'processor', id: 'parse' },
      { kind: 'processor', id: 'enrich' },
    ]);
  });

  it('takes the rate from the first processor in the order given', async () => {
    mockFetch.mockResolvedValue(TWO_PROCESSORS);
    const { result } = renderHook(
      () => useSlotStats({ ref: ROUTE_SLOT, processorIds: ['enrich', 'parse'] }),
      { wrapper }
    );
    await advance(STATS_BATCH_DEBOUNCE_MS);

    expect(result.current.eventsRate).toBe(400);
  });

  it('reads the instance of its own slot when the processor runs in several', async () => {
    mockFetch.mockResolvedValue(
      responseWith({
        shout: [rawInstance('main', null, 100, 0.001), rawInstance('main', 0, 200, 0.002)],
      })
    );
    const { result } = renderHook(
      () => ({
        pipeline: useSlotStats({ ref: PIPELINE_SLOT, processorIds: ['shout'] }),
        route: useSlotStats({ ref: ROUTE_SLOT, processorIds: ['shout'] }),
      }),
      { wrapper }
    );
    await advance(STATS_BATCH_DEBOUNCE_MS);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.pipeline.eventsRate).toBe(100);
    expect(result.current.route.eventsRate).toBe(200);
  });

  it('is ready with no values when the processor has no instance in the slot', async () => {
    mockFetch.mockResolvedValue(responseWith({ shout: [rawInstance('main', 3, 100, 0.001)] }));
    const { result } = renderHook(
      () => useSlotStats({ ref: ROUTE_SLOT, processorIds: ['shout'] }),
      { wrapper }
    );
    await advance(STATS_BATCH_DEBOUNCE_MS);

    expect(result.current).toEqual({ status: 'ready', eventsRate: null, durationAverage: null });
  });

  it('registers nothing and stays unknown for an empty list', async () => {
    const { result } = renderHook(() => useSlotStats({ ref: ROUTE_SLOT, processorIds: [] }), {
      wrapper,
    });
    await advance(STATS_BATCH_DEBOUNCE_MS * 5);

    expect(result.current.status).toBe('unknown');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not request again for a new array of the same ids', async () => {
    mockFetch.mockResolvedValue(TWO_PROCESSORS);
    const { rerender } = renderHook(
      ({ ids }) => useSlotStats({ ref: ROUTE_SLOT, processorIds: ids }),
      { wrapper, initialProps: { ids: ['parse', 'enrich'] } }
    );
    await advance(STATS_BATCH_DEBOUNCE_MS);

    rerender({ ids: ['parse', 'enrich'] });
    await advance(STATS_BATCH_DEBOUNCE_MS);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('requests a processor that is added to the slot, and updates the numbers', async () => {
    mockFetch.mockResolvedValue(TWO_PROCESSORS);
    const { result, rerender } = renderHook(
      ({ ids }) => useSlotStats({ ref: ROUTE_SLOT, processorIds: ids }),
      { wrapper, initialProps: { ids: ['parse'] } }
    );
    await advance(STATS_BATCH_DEBOUNCE_MS);
    expect(result.current.durationAverage).toBeCloseTo(0.002);

    rerender({ ids: ['parse', 'enrich'] });
    await advance(STATS_BATCH_DEBOUNCE_MS);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1][1].params.body.components).toEqual([
      { kind: 'processor', id: 'enrich' },
    ]);
    expect(result.current.durationAverage).toBeCloseTo(0.008);
  });

  it('does not re-render when a refresh returns equal values', async () => {
    mockFetch.mockResolvedValue(TWO_PROCESSORS);
    const renders = { count: 0 };
    const refresher: { refresh: () => void } = { refresh: () => {} };

    const Probe = () => {
      renders.count += 1;
      useSlotStats({ ref: ROUTE_SLOT, processorIds: ['parse', 'enrich'] });
      return null;
    };
    const Refresher = () => {
      refresher.refresh = useStatsRefresh().refresh;
      return null;
    };
    render(
      <StatsManagerProvider unitId={UNIT_ID}>
        <Probe />
        <Refresher />
      </StatsManagerProvider>
    );
    await advance(STATS_BATCH_DEBOUNCE_MS);
    const rendersAfterFirstResult = renders.count;

    act(() => refresher.refresh());
    await advance(0);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(renders.count).toBe(rendersAfterFirstResult);
  });
});
