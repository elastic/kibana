/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { mapStatsResponse } from './map_stats_response';
import type { DestinationStatsView, ProcessorInstanceStatsView, UnitStatsClient } from './types';

const seconds = (value: number | null) => ({ value, unit: 's' });
const items = (value: number | null) => ({ value, unit: '{item}' });
const perSecond = (value: number | null) => ({ value, unit: '{item}', time_unit: 's' });

const META: StreamsUnit.StatsMeta = {
  window: { start: '2026-10-27T12:00:00.000Z', end: '2026-10-27T12:15:00.000Z' },
};

const destinationResult = ({
  eventsRate = null,
  eventsTotal = null,
  failedRate = null,
  latencyAverage = null,
  series = { bucketMs: 300000, points: [] },
  error,
}: Partial<DestinationStatsView> & {
  error?: StreamsUnit.StatsError;
} = {}): StreamsUnit.StatsDestinationResult => ({
  ...(error ? { error } : {}),
  latency: { average: seconds(latencyAverage) },
  events: {
    incoming: {
      total: items(eventsTotal),
      rate: perSecond(eventsRate),
      series: { bucket_ms: series.bucketMs, points: series.points },
    },
    failed: { rate: perSecond(failedRate) },
  },
});

const processorInstance = ({
  pipelineId,
  routeIndex,
  eventsRate = null,
  failedRate = null,
  durationAverage = null,
}: Partial<ProcessorInstanceStatsView> &
  Pick<
    ProcessorInstanceStatsView,
    'pipelineId' | 'routeIndex'
  >): StreamsUnit.StatsProcessorInstance => ({
  pipeline_id: pipelineId,
  route_index: routeIndex,
  processing_duration: { average: seconds(durationAverage) },
  events: { incoming: { rate: perSecond(eventsRate) }, failed: { rate: perSecond(failedRate) } },
});

/** One processor used in a pipeline and in two of its routes, as the Map draws it: one slot each. */
const REUSED_PROCESSOR: StreamsUnit.StatsProcessorResult = {
  instances: [
    processorInstance({
      pipelineId: 'main',
      routeIndex: null,
      eventsRate: 3700,
      durationAverage: 0.008,
    }),
    processorInstance({
      pipelineId: 'main',
      routeIndex: 0,
      eventsRate: 1200,
      durationAverage: 0.0004,
    }),
    // An instance can have a rate and no duration.
    processorInstance({
      pipelineId: 'main',
      routeIndex: 1,
      eventsRate: 2500,
      durationAverage: null,
    }),
  ],
};

const DESTINATIONS_WITH_DATA = {
  'es-prod': destinationResult({
    eventsRate: 3700,
    eventsTotal: 3330000,
    failedRate: 0,
    latencyAverage: 0.012,
    series: {
      bucketMs: 300000,
      points: [
        { start: '2026-10-27T12:00:00.000Z', value: 1110000 },
        { start: '2026-10-27T12:05:00.000Z', value: 1110000 },
        { start: '2026-10-27T12:10:00.000Z', value: 1110000 },
      ],
    },
  }),
  // A rate of exactly 0 is data, not no data.
  'es-dev': destinationResult({
    eventsRate: 0,
    eventsTotal: 0,
    failedRate: 0,
    latencyAverage: 0.02,
  }),
};

export type StatsFixtureScenario =
  | 'data'
  | 'noData'
  | 'partial'
  | 'kindError'
  | 'unsupportedDestination'
  | 'notFound';

export const STATS_FIXTURE_RESPONSES: Record<StatsFixtureScenario, StreamsUnit.StatsResponse> = {
  data: {
    components: {
      destinations: DESTINATIONS_WITH_DATA,
      processors: { 'uppercase-message': REUSED_PROCESSOR },
    },
    meta: META,
  },
  noData: {
    components: {
      destinations: { 'es-prod': destinationResult(), 'es-dev': destinationResult() },
      processors: { 'uppercase-message': { instances: [] } },
    },
    meta: META,
  },
  // One destination has an error and the others have data.
  partial: {
    components: {
      destinations: {
        'es-prod': DESTINATIONS_WITH_DATA['es-prod'],
        'es-dev': destinationResult({
          error: { code: 'error', reason: 'The search for destination stats failed' },
        }),
      },
      processors: { 'uppercase-message': REUSED_PROCESSOR },
    },
    meta: META,
  },
  // A failed search for one kind sets the same error on every component of that kind.
  kindError: {
    components: {
      destinations: {
        'es-prod': destinationResult({
          error: { code: 'unavailable', reason: 'Elasticsearch is unavailable' },
        }),
        'es-dev': destinationResult({
          error: { code: 'unavailable', reason: 'Elasticsearch is unavailable' },
        }),
      },
      processors: { 'uppercase-message': REUSED_PROCESSOR },
    },
    meta: META,
  },
  // A destination type whose exporter reports no metrics, such as S3: all null and no error.
  unsupportedDestination: {
    components: {
      destinations: { 's3-archive': destinationResult() },
      processors: {},
    },
    meta: META,
  },
  // A destination that is staged on the Map but not in the persisted unit yet.
  notFound: {
    components: {
      destinations: {
        'es-staged': destinationResult({
          error: { code: 'not_found', reason: 'destination es-staged is not in the unit' },
        }),
      },
      processors: {},
    },
    meta: META,
  },
};

const createAbortError = () => new DOMException('The request was aborted', 'AbortError');

const createServiceUnavailableError = () =>
  Object.assign(new Error('Service Unavailable'), {
    body: { statusCode: 503, error: 'Service Unavailable', message: 'Service Unavailable' },
  });

const waitOrAbort = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError());
      return;
    }

    const timeout = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout);
        reject(createAbortError());
      },
      { once: true }
    );
  });

/**
 * Same interface as the real client, for tests and local work. `delayMs` makes a slow response
 * that rejects when the signal aborts. `requestFailure` throws as a 503 of the whole request does.
 */
export const createFixtureUnitStatsClient = ({
  scenario,
  delayMs = 0,
}: {
  scenario: StatsFixtureScenario | 'requestFailure';
  delayMs?: number;
}): UnitStatsClient => ({
  fetchStats: async ({ components }, { signal }) => {
    if (delayMs > 0) {
      await waitOrAbort(delayMs, signal);
    } else if (signal.aborted) {
      throw createAbortError();
    }

    if (scenario === 'requestFailure') {
      throw createServiceUnavailableError();
    }

    return mapStatsResponse(STATS_FIXTURE_RESPONSES[scenario], components);
  },
});
