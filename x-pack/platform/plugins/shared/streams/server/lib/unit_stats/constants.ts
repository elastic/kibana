/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stream, field names and the window for unit stats, in one place.
 *
 * Each document is a delta over `start_timestamp` to `@timestamp`, and the pipeline
 * writes one metric per document.
 */

/** Query the exact name. A wildcard hides both a 403 and a missing stream. */
export const UNIT_STATS_STREAM = 'metrics-streams.otel-default';

export const UNIT_STATS_DEFAULT_WINDOW_MS = 15 * 60 * 1000;

export const UNIT_STATS_QUERY_TIMEOUT = '30s';

export const UNIT_ID_FIELD = 'resource.attributes.unit.id';

export const CONFIG_HASH_FIELD = 'resource.attributes.streams.config.hash';

export const TIMESTAMP_FIELD = '@timestamp';
export const START_TIMESTAMP_FIELD = 'start_timestamp';

export const DIRECTION_FIELD = 'attributes.direction';
export const OUTCOME_FIELD = 'attributes.outcome';
export const OUTCOME_SUCCESS = 'success';
export const OUTCOME_FAILURE = 'failure';

export const DESTINATION_ID_FIELD = 'attributes.streams.destination.id';
export const DESTINATION_ITEMS_FIELD = 'metrics.streams.destination.items';
export const DESTINATION_DURATION_FIELD = 'metrics.streams.destination.duration';

/** The telemetry calls a processor a step. */
export const STEP_ID_FIELD = 'attributes.streams.step.id';
export const STEP_ITEMS_FIELD = 'metrics.streams.step.items';
export const STEP_DURATION_FIELD = 'metrics.streams.step.duration';

/** Destination types that emit user-facing metrics (ADR 348, decision 4). */
export const DESTINATION_TYPES_WITH_STATS = ['elasticsearch'];

/** Same target as the classic Streams histograms (`STREAMS_HISTOGRAM_NUM_DATA_POINTS`). */
export const SERIES_TARGET_POINTS = 25;

/** The export interval. A bucket is never narrower. */
export const SERIES_MIN_BUCKET_MS = 10_000;

/** UCUM units. Durations are natively in seconds, so no conversion happens. */
export const ITEM_UNIT = '{item}';
export const SECONDS_UNIT = 's';
export const RATE_TIME_UNIT = 's';
