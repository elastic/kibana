/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamIndexMode } from '../models/ingest/base';

/**
 * Checks if the given index mode is a TSDB (Time Series Database) mode.
 *
 * TSDB mode uses the 'TS' ES|QL source command instead of 'FROM' for querying.
 *
 * @param indexMode - The index mode to check, can be undefined
 * @returns true if the index mode is 'time_series', false otherwise
 */
export function isTSDBMode(
  indexMode: IngestStreamIndexMode | undefined
): indexMode is 'time_series' {
  return indexMode === 'time_series';
}
