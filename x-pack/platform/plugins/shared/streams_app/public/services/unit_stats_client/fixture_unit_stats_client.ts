/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { StreamsUnit } from '@kbn/streams-schema';
import { mapStatsResponse } from './map_stats_response';
import type {
  DestinationStatsView,
  ProcessorInstanceStatsView,
  SourceStatsView,
  UnitStatsClient,
} from './types';

const seconds = (value: number | null) => ({ value, unit: 's' });
const items = (value: number | null) => ({ value, unit: '{item}' });
const perSecond = (value: number | null) => ({ value, unit: '{item}', time_unit: 's' });
const percent = (value: number | null) => ({ value, unit: '%' });

const META: StreamsUnit.StatsMeta = {
  window: { start: '2026-10-27T12:00:00.000Z', end: '2026-10-27T12:15:00.000Z' },
};

interface FailureClassFixture {
  rate: number | null;
  percentage: number | null;
  breakdown?: Array<{
    collection: string | null;
    reason: string | null;
    rate: number | null;
    percentage: number | null;
  }>;
}

const NO_FAILURE_CLASS: FailureClassFixture = { rate: null, percentage: null };

/** A failure class as the API sends it. `unit` is what the destination type counts. */
const failureClass = (
  { rate, percentage, breakdown }: FailureClassFixture,
  unit: string
): StreamsUnit.StatsDestinationResult['events']['failed']['authentication'] => ({
  rate: { value: rate, unit, time_unit: 's' },
  percentage: percent(percentage),
  ...(breakdown
    ? {
        breakdown: breakdown.map((cause) => ({
          collection: cause.collection,
          reason: cause.reason,
          rate: { value: cause.rate, unit, time_unit: 's' },
          percentage: percent(cause.percentage),
        })),
      }
    : {}),
});

/**
 * A delivery series over the window of the fixtures, in buckets of 30 seconds, as the API sends it.
 * Each count of failures is the share of the attempts of a bucket that it ends at, and it rises to
 * that share over the window, as when a credential has just been revoked. The rest was delivered.
 */
const deliverySeries = ({
  unit,
  attemptsPerBucket = 40,
  authentication = 0,
  authorization = 0,
  other = 0,
}: {
  unit: string;
  attemptsPerBucket?: number;
  /** The share of the attempts, from 0 to 1, that each count ends at. */
  authentication?: number;
  authorization?: number;
  other?: number;
}): StreamsUnit.StatsDeliverySeries => {
  const bucketMs = 30_000;
  const start = Date.parse(META.window.start);
  const count = (Date.parse(META.window.end) - start) / bucketMs;

  return {
    bucket_ms: bucketMs,
    unit,
    points: Array.from({ length: count }, (_, index) => {
      const ramp = Math.min(1, (index / (count - 1)) * 1.6);
      const part = (share: number) => Math.round(attemptsPerBucket * share * ramp);
      const authenticationCount = part(authentication);
      const authorizationCount = part(authorization);

      return {
        start: new Date(start + index * bucketMs).toISOString(),
        total: attemptsPerBucket,
        failed: authenticationCount + authorizationCount + part(other),
        authentication: authenticationCount,
        authorization: authorizationCount,
      };
    }),
  };
};

const destinationResult = ({
  eventsRate = null,
  eventsTotal = null,
  failedRate = null,
  failedPercentage = null,
  failedUnit = '{item}',
  authentication = NO_FAILURE_CLASS,
  authorization = NO_FAILURE_CLASS,
  latencyAverage = null,
  series = { bucketMs: 300000, points: [] },
  delivery,
  error,
}: Partial<Omit<DestinationStatsView, 'failed'>> & {
  /** What the API sends when the request asks for the delivery series. */
  delivery?: StreamsUnit.StatsDeliverySeries;
  failedRate?: number | null;
  failedPercentage?: number | null;
  /** `{item}`, or `{request}` for a destination type that reports upload attempts, such as S3. */
  failedUnit?: string;
  authentication?: FailureClassFixture;
  authorization?: FailureClassFixture;
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
    failed: {
      rate: { value: failedRate, unit: failedUnit, time_unit: 's' },
      percentage: percent(failedPercentage),
      authentication: failureClass(authentication, failedUnit),
      authorization: failureClass(authorization, failedUnit),
    },
    ...(delivery ? { delivery: { series: delivery } } : {}),
  },
});

const sourceResult = ({
  acceptedRate = null,
  error,
}: Partial<SourceStatsView> & {
  error?: StreamsUnit.StatsError;
} = {}): StreamsUnit.StatsSourceResult => ({
  ...(error ? { error } : {}),
  events: { accepted: { rate: perSecond(acceptedRate) } },
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
  | 'notFound'
  | 'authFailures'
  | 's3Failures'
  | 'partialFailure';

export const STATS_FIXTURE_RESPONSES: Record<StatsFixtureScenario, StreamsUnit.StatsResponse> = {
  data: {
    components: {
      destinations: DESTINATIONS_WITH_DATA,
      processors: { 'uppercase-message': REUSED_PROCESSOR },
      sources: {
        'otlp-input': sourceResult({ acceptedRate: 3700 }),
        'idle-input': sourceResult({ acceptedRate: 0 }),
      },
    },
    meta: META,
  },
  noData: {
    components: {
      destinations: { 'es-prod': destinationResult(), 'es-dev': destinationResult() },
      processors: { 'uppercase-message': { instances: [] } },
      sources: { 'otlp-input': sourceResult() },
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
      sources: {},
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
      sources: {
        'otlp-input': sourceResult({
          error: { code: 'unavailable', reason: 'Elasticsearch is unavailable' },
        }),
      },
    },
    meta: META,
  },
  // A destination type whose exporter reports no metrics, such as S3: all null and no error.
  unsupportedDestination: {
    components: {
      destinations: { 's3-archive': destinationResult() },
      processors: {},
      sources: {},
    },
    meta: META,
  },
  // A destination or source that is staged on the Map but not in the persisted unit yet.
  notFound: {
    components: {
      destinations: {
        'es-staged': destinationResult({
          error: { code: 'not_found', reason: 'destination es-staged is not in the unit' },
        }),
      },
      processors: {},
      sources: {
        'otlp-staged': sourceResult({
          error: { code: 'not_found', reason: 'source otlp-staged is not in the unit' },
        }),
      },
    },
    meta: META,
  },
  // `es-dev` is refused, in items. A request-level 401 has no cause in the breakdown. A per-document
  // 403 names the data stream and the error type, for each of the data streams that it refused. The percentages are shares of 4.2 items a second.
  authFailures: {
    components: {
      destinations: {
        'es-prod': DESTINATIONS_WITH_DATA['es-prod'],
        'es-dev': destinationResult({
          eventsRate: 4.2,
          eventsTotal: 3780,
          failedRate: 2.4,
          failedPercentage: 57.1,
          latencyAverage: 0.17,
          delivery: deliverySeries({
            unit: '{item}',
            authentication: 0.119,
            authorization: 0.452,
          }),
          authentication: { rate: 0.5, percentage: 11.9 },
          authorization: {
            rate: 1.9,
            percentage: 45.2,
            breakdown: [
              {
                collection: 'logs-generic.otel-default',
                reason: 'security_exception',
                rate: 1.1,
                percentage: 26.2,
              },
              {
                collection: 'logs-nginx.access-default',
                reason: 'security_exception',
                rate: 0.5,
                percentage: 11.9,
              },
              {
                collection: 'metrics-system.cpu-default',
                reason: 'security_exception',
                rate: 0.3,
                percentage: 7.1,
              },
            ],
          },
        }),
      },
      processors: {},
      sources: {},
    },
    meta: META,
  },
  // An S3 destination counts upload attempts, so its failures are in requests while its incoming
  // items stay in items. It has no collection, and its reason is the S3 error code.
  s3Failures: {
    components: {
      destinations: {
        's3-test': destinationResult({
          eventsRate: 0.28,
          eventsTotal: 100,
          failedRate: 0.44,
          failedPercentage: 100,
          failedUnit: '{request}',
          latencyAverage: 0.06,
          delivery: deliverySeries({ unit: '{request}', authentication: 1 }),
          authentication: {
            rate: 0.44,
            percentage: 100,
            breakdown: [
              { collection: null, reason: 'SignatureDoesNotMatch', rate: 0.44, percentage: 100 },
            ],
          },
          authorization: { rate: 0, percentage: 0 },
        }),
      },
      processors: {},
      sources: {},
    },
    meta: META,
  },
  // A destination whose failure query failed has real values next to an error, and no failure rates.
  partialFailure: {
    components: {
      destinations: {
        'es-dev': destinationResult({
          eventsRate: 4.2,
          eventsTotal: 3780,
          failedRate: 2.4,
          latencyAverage: 0.17,
          error: { code: 'error', reason: 'The stats query failed.' },
        }),
      },
      processors: {},
      sources: {},
    },
    meta: META,
  },
};

/**
 * The response with the delivery series only on the destinations that ask for it, as the API
 * leaves it out of the others.
 */
const withRequestedSeries = (
  response: StreamsUnit.StatsResponse,
  components: StreamsUnit.StatsComponentRef[]
): StreamsUnit.StatsResponse => {
  const asked = new Set(
    components.flatMap((ref) =>
      ref.kind === 'destination' && ref.include?.delivery_series ? [ref.id] : []
    )
  );

  return {
    ...response,
    components: {
      ...response.components,
      destinations: Object.fromEntries(
        Object.entries(response.components.destinations).map(([id, { events, ...result }]) => {
          const { delivery, ...otherEvents } = events;
          return [id, { ...result, events: asked.has(id) && delivery ? events : otherEvents }];
        })
      ),
    },
  };
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

    return mapStatsResponse(
      withRequestedSeries(STATS_FIXTURE_RESPONSES[scenario], components),
      components
    );
  },
});

/**
 * A repository client that answers the stats route from a fixture scenario, as the server does, for
 * a story whose code builds its own stats client from the repository client of the page, such as
 * the popover of a node, so that the real client maps the response.
 */
export const createFixtureStreamsRepositoryClient = (
  scenario: StatsFixtureScenario
): StreamsRepositoryClient =>
  ({
    fetch: async (_endpoint: string, { params }: { params: { body: StreamsUnit.StatsRequest } }) =>
      withRequestedSeries(STATS_FIXTURE_RESPONSES[scenario], params.body.components ?? []),
    // The type of the client is that of every route, and a story answers only this one.
  }) as unknown as StreamsRepositoryClient;
