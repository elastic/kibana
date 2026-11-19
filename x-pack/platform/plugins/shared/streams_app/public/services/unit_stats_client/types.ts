/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';

/**
 * The Map uses the default window, which sends no `filter` and lets the server pick its default.
 * A range becomes `filter.time_range`.
 */
export type StatsWindow = { kind: 'default' } | { kind: 'range'; start: string; end: string };

export type StatsStatus = 'loading' | 'ready' | 'noData' | 'error' | 'stale';

/**
 * What failed, per second, and what share of the attempts that is. `unit` says what `rate` counts:
 * `{item}` for Elasticsearch and `{request}` (upload attempts) for S3. The percentage is a share of
 * the same thing, in percent. Never add or compare a rate of requests to a rate of items. `null`
 * means no data.
 */
export interface FailureRateView {
  rate: number | null;
  unit: string;
  percentage: number | null;
}

/** One cause of failures. Either field is `null` when the destination did not report it. */
export interface FailureCauseView extends FailureRateView {
  collection: string | null;
  reason: string | null;
}

/** The failures of one class, with its causes. The percentage of a cause is a share of all attempts. */
export interface FailureClassView extends FailureRateView {
  breakdown: FailureCauseView[];
}

/**
 * What was attempted and what failed in each bucket of `bucketMs`, as counts in `unit`, for the
 * delivery chart of the flyout. `failed` includes both classes, so the delivered count is `total`
 * minus `failed`, and the failures of other causes are `failed` minus the two classes. A bucket
 * with no attempts has no point, so `window` says what the series covers. It is only there when the
 * request asked for it, and the destination type can report it.
 */
export interface DeliverySeriesView {
  bucketMs: number;
  unit: string;
  /** The time that the series covers, as ISO times. */
  window: { start: string; end: string };
  points: Array<{
    start: string;
    total: number;
    failed: number;
    authentication: number;
    authorization: number;
  }>;
}

export interface DestinationFailedView {
  total: FailureRateView;
  authentication: FailureClassView;
  authorization: FailureClassView;
  series?: DeliverySeriesView;
}

/** Rates are per second and durations are in seconds, as the API returns them. `null` means no data. */
export interface DestinationStatsView {
  eventsRate: number | null;
  eventsTotal: number | null;
  failed: DestinationFailedView;
  latencyAverage: number | null;
  series: { bucketMs: number; points: Array<{ start: string; value: number }> };
}

export interface ProcessorInstanceStatsView {
  pipelineId: string;
  /** The position of the route in the pipeline, `null` for the processors of the pipeline itself. */
  routeIndex: number | null;
  eventsRate: number | null;
  failedRate: number | null;
  durationAverage: number | null;
}

export interface ProcessorStatsView {
  instances: ProcessorInstanceStatsView[];
}

export interface SourceStatsView {
  acceptedRate: number | null;
}

/** What the mapper returns for one component of a response. */
export interface MappedComponentStats<TStats> {
  status: 'ready' | 'noData' | 'error';
  stats: TStats;
  /** An open code. Unknown codes show a generic problem state. */
  error?: StreamsUnit.StatsError;
}

export interface MappedStatsResponse {
  destinations: Record<string, MappedComponentStats<DestinationStatsView>>;
  processors: Record<string, MappedComponentStats<ProcessorStatsView>>;
  sources: Record<string, MappedComponentStats<SourceStatsView>>;
  window: StreamsUnit.StatsMeta['window'];
}

export interface StatsFetchRequest {
  /** Without duplicates. The client sends them in requests of at most the limit of the route. */
  components: StreamsUnit.StatsComponentRef[];
  window: StatsWindow;
}

export interface UnitStatsClient {
  fetchStats: (
    request: StatsFetchRequest,
    options: { signal: AbortSignal }
  ) => Promise<MappedStatsResponse>;
}
