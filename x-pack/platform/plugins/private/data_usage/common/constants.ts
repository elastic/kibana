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
