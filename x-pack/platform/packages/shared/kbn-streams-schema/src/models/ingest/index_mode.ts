/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

/**
 * Index mode values returned by Elasticsearch for data streams.
 * - standard: Default index mode
 * - time_series: Time series data stream (TSDB)
 * - logsdb: Logs data stream
 * - lookup: Lookup index mode
 */
export type IngestStreamIndexMode = 'standard' | 'time_series' | 'logsdb' | 'lookup';

export const ingestStreamIndexModeSchema: z.Schema<IngestStreamIndexMode> = z.enum([
  'standard',
  'time_series',
  'logsdb',
  'lookup',
]);
