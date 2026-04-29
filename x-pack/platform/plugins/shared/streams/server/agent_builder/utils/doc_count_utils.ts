/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { FAILURE_STORE_SELECTOR } from '../../../common/constants';

/**
 * Returns the total document count for a stream within a time range.
 * Uses ES|QL COUNT(*) with a @timestamp filter — lightweight single-shard query.
 */
export async function getDocCountInTimeRange(options: {
  esClient: ElasticsearchClient;
  streamName: string;
  start: number;
  end: number;
}): Promise<number> {
  const { esClient, streamName, start, end } = options;
  const startIso = new Date(start).toISOString();
  const endIso = new Date(end).toISOString();

  try {
    const response = (await esClient.esql.query({
      query: `FROM ${streamName} | WHERE @timestamp >= "${startIso}" AND @timestamp <= "${endIso}" | STATS total = COUNT(*)`,
      drop_null_columns: true,
    })) as ESQLSearchResponse;

    const col = response.columns.findIndex((c) => c.name === 'total');
    if (col === -1 || !response.values.length) {
      return 0;
    }
    return Number(response.values[0][col]) || 0;
  } catch {
    return 0;
  }
}

/**
 * Returns the timestamp of the most recent failure store document for a stream,
 * or null if the failure store is empty. Uses a single MAX aggregation — very cheap.
 */
export async function getLastFailureTimestamp(options: {
  esClient: ElasticsearchClient;
  streamName: string;
}): Promise<string | null> {
  const { esClient, streamName } = options;
  try {
    const response = (await esClient.esql.query({
      query: `FROM ${streamName}${FAILURE_STORE_SELECTOR} | STATS last_ts = MAX(@timestamp)`,
      drop_null_columns: true,
    })) as ESQLSearchResponse;

    const col = response.columns.findIndex((c) => c.name === 'last_ts');
    if (col === -1 || !response.values.length) {
      return null;
    }
    const value = response.values[0][col];
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}
