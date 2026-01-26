/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamIndexMode } from '@kbn/streams-schema';

/**
 * Determines the ES|QL source command to use based on the stream's index mode.
 * - For time_series index mode (TSDB), returns 'TS'
 * - For all other index modes (standard, logsdb, lookup) or when index_mode is undefined, returns 'FROM'
 *
 * @param indexMode - The index mode of the data stream
 * @returns 'TS' for time_series streams, 'FROM' for all others
 */
export function getEsqlSourceCommand(indexMode: IngestStreamIndexMode | undefined): 'TS' | 'FROM' {
  return indexMode === 'time_series' ? 'TS' : 'FROM';
}
