/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, ApiClientResponse, EsClient } from '@kbn/scout';
import type { LogViewAttributes, LogViewColumnConfiguration } from '../../../../common/log_views';
import { LOG_ENTRIES_SEARCH_STRATEGY } from '../../../../common/search_strategies/log_entries/log_entries';
import { COMMON_HEADERS } from './constants';

export const SEARCH_PATH = `internal/search/${LOG_ENTRIES_SEARCH_STRATEGY}`;
export const START_TIMESTAMP = Date.parse('2026-01-01T00:00:00.000Z');
export const END_TIMESTAMP = Date.parse('2026-01-01T01:00:00.000Z');
export const DOCUMENT_COUNT = 3;

export const createColumns = (count: number): LogViewColumnConfiguration[] => [
  { timestampColumn: { id: 'timestamp' } },
  { messageColumn: { id: 'message' } },
  ...Array.from({ length: count - 2 }, (_, index) => ({
    fieldColumn: { id: `field-${index}`, field: 'event.dataset' },
  })),
];

export const createLogViewAttributes = (
  indexName: string,
  columnCount: number
): LogViewAttributes => ({
  name: 'Scout log view',
  description: '',
  logIndices: { type: 'index_name', indexName },
  logColumns: createColumns(columnCount),
});

/** Creates an index holding `DOCUMENT_COUNT` log documents inside the test time range. */
export const createLogIndex = async (esClient: EsClient, index: string): Promise<void> => {
  await esClient.indices.create({
    index,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        message: { type: 'text' },
        'event.dataset': { type: 'keyword' },
      },
    },
  });
  await esClient.bulk({
    refresh: 'wait_for',
    operations: Array.from({ length: DOCUMENT_COUNT }, (_, position) => [
      { index: { _index: index } },
      {
        '@timestamp': new Date(START_TIMESTAMP + (position + 1) * 60_000).toISOString(),
        message: `log message ${position}`,
        'event.dataset': 'scout.log',
      },
    ]).flat(),
  });
};

/** Submits a log entries search and polls it until Elasticsearch reports it complete. */
export const searchLogEntriesToCompletion = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  params: object
): Promise<ApiClientResponse> => {
  const headers = { ...COMMON_HEADERS, ...cookieHeader };
  let response = await apiClient.post(SEARCH_PATH, {
    headers,
    body: { params },
    responseType: 'json',
  });

  while (response.statusCode === 200 && response.body.isRunning) {
    response = await apiClient.post(`${SEARCH_PATH}/${encodeURIComponent(response.body.id)}`, {
      headers,
      body: { params, pollLength: '10s' },
      responseType: 'json',
    });
  }

  return response;
};
