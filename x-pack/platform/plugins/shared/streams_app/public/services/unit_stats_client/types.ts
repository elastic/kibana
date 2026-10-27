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

/** Rates are per second and durations are in seconds, as the API returns them. `null` means no data. */
export interface DestinationStatsView {
  eventsRate: number | null;
  eventsTotal: number | null;
  failedRate: number | null;
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
  window: StreamsUnit.StatsMeta['window'];
}

export interface StatsFetchRequest {
  /** At most `MAX_STREAMS_UNIT_STATS_COMPONENTS`, without duplicates. The manager chunks. */
  components: StreamsUnit.StatsComponentRef[];
  window: StatsWindow;
}

export interface UnitStatsClient {
  fetchStats: (
    request: StatsFetchRequest,
    options: { signal: AbortSignal }
  ) => Promise<MappedStatsResponse>;
}
