/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageMetricsAutoOpsResponseSchemaBody } from '../../../server/services/autoops_api';

export const DATA_STREAMS = ['scout-du-cpu', 'scout-du-memory', 'scout-du-nginx'];

const series = (from: number, to: number) => [
  [1726858530000, from],
  [1726862130000, to],
];

export const AUTOOPS_METRICS_RESPONSE: UsageMetricsAutoOpsResponseSchemaBody = {
  ingest_rate: DATA_STREAMS.map((name) => ({
    name,
    error: null,
    data: series(13756849, 14657904),
  })),
  storage_retained: DATA_STREAMS.map((name) => ({
    name,
    error: null,
    data: series(12576413, 13956423),
  })),
};

export const DATA_STREAMS_RESPONSE = DATA_STREAMS.map((name, i) => ({
  name,
  storageSizeBytes: 6197 - i * 1000,
}));
