/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_STREAMS_UNIT_STATS_COMPONENTS } from '@kbn/streams-schema';

/**
 * Stream, field names and the window for unit stats, in one place.
 *
 * Each document is a delta over `start_timestamp` to `@timestamp`, and the pipeline
 * writes one metric per document.
 */

/** The stats queries and the existence probe both use the exact name. */
export const UNIT_METRICS_STREAM = 'metrics-streams.otel-default';

export const UNIT_STATS_DEFAULT_WINDOW_MS = 15 * 60 * 1000;

/** ES|QL returns at most this many rows and truncates silently, with no warning. */
export const ESQL_MAX_ROWS = 10_000;

export const UNIT_STATS_REQUEST_TIMEOUT_MS = 30_000;

export const UNIT_ID_FIELD = 'resource.attributes.unit.id';

export const CONFIG_HASH_FIELD = 'resource.attributes.streams.config.hash';

export const DIRECTION_FIELD = 'attributes.direction';
export const OUTCOME_FIELD = 'attributes.outcome';

export const DESTINATION_ID_FIELD = 'scope.attributes.streams.destination.id';
export const DESTINATION_ITEMS_FIELD = 'metrics.streams.destination.items';
export const DESTINATION_DURATION_FIELD = 'metrics.streams.destination.duration';

/** The telemetry calls a processor a step. */
export const STEP_ID_FIELD = 'scope.attributes.streams.step.id';
export const STEP_PIPELINE_ID_FIELD = 'scope.attributes.streams.pipeline.id';
/** Set only on a step that runs in a route pipeline. The full path: the short name is also a datapoint attribute of the route metrics. */
export const STEP_ROUTE_INDEX_FIELD = 'scope.attributes.streams.route.index';
export const STEP_ITEMS_FIELD = 'metrics.streams.step.items';
export const STEP_DURATION_FIELD = 'metrics.streams.step.duration';

/** Columns the stats queries return and the mappers read into the response. */
export const STATS_COLUMN = {
  id: 'id',
  step: 'step',
  pipeline: 'pipeline',
  routeIndex: 'route_index',
  bucket: 'bucket',
  incomingRate: 'incoming_rate',
  failedRate: 'failed_rate',
  avgLatency: 'avg_latency',
  sumItems: 'sum_items',
  avgDurationPerItem: 'avg_duration_per_item',
} as const;

/** The bucket count a series aims for, as Discover's auto interval does with a bar target. */
export const SERIES_TARGET_BUCKETS = 50;

/**
 * The most buckets a series can have. One series query returns one row per id and bucket (and
 * a partial bucket at each end), so the cap keeps every id of one request within `ESQL_MAX_ROWS`
 * and no query needs to be split.
 */
export const SERIES_MAX_BUCKETS = Math.floor(ESQL_MAX_ROWS / MAX_STREAMS_UNIT_STATS_COMPONENTS) - 1;

/** The export interval. A bucket is never narrower. */
export const SERIES_MIN_BUCKET_MS = 10_000;

/** UCUM units. Durations are natively in seconds, so no conversion happens. */
export const ITEM_UNIT = '{item}';
export const SECONDS_UNIT = 's';
export const RATE_TIME_UNIT = 's';
