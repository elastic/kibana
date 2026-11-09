/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'data_usage';

export const DEFAULT_SELECTED_OPTIONS = 50 as const;

export const DATA_USAGE_API_ROUTE_PREFIX = '/api/data_usage/';
export const DATA_USAGE_METRICS_API_ROUTE = `/internal${DATA_USAGE_API_ROUTE_PREFIX}metrics`;
export const DATA_USAGE_DATA_STREAMS_API_ROUTE = `/internal${DATA_USAGE_API_ROUTE_PREFIX}data_streams`;

/**
 * Maximum number of data streams the AutoOps metrics API accepts in a single request.
 *
 * AutoOps declares `maximum: 100` on `ProjectMetricsRequest.size`, and `size` is derived from the
 * number of data streams the request covers, so a larger selection has to be split into batches
 * that each stay within the limit.
 */
export const AUTOOPS_MAX_DATA_STREAMS_PER_REQUEST = 100 as const;

/** How many batched AutoOps metrics requests are issued concurrently. */
export const AUTOOPS_MAX_CONCURRENT_REQUESTS = 4 as const;

/** How many data streams are resolved per Elasticsearch `indices.getDataStream` call. */
export const ES_DATA_STREAM_LOOKUP_CHUNK_SIZE = 50 as const;
