/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, ApiClientResponse } from '@kbn/scout';
import type { LogViewAttributes, LogViewColumnConfiguration } from '../../../../common/log_views';
import { LOG_ENTRIES_SEARCH_STRATEGY } from '../../../../common/search_strategies/log_entries/log_entries';
import { COMMON_HEADERS } from './constants';

const SEARCH_PATH = `internal/search/${LOG_ENTRIES_SEARCH_STRATEGY}`;
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

export interface LogEntriesSearchClient {
  search: (apiClient: ApiClientFixture, params: object) => Promise<ApiClientResponse>;
  poll: (
    apiClient: ApiClientFixture,
    requestId: string,
    params: object
  ) => Promise<ApiClientResponse>;
  /** Submits a search and polls it until Elasticsearch reports it complete. */
  searchToCompletion: (apiClient: ApiClientFixture, params: object) => Promise<ApiClientResponse>;
}

/** Calls the log entries search strategy as the user the given cookie belongs to. */
export const getLogEntriesSearchClient = (
  cookieHeader: Record<string, string>
): LogEntriesSearchClient => {
  const headers = { ...COMMON_HEADERS, ...cookieHeader };

  const search: LogEntriesSearchClient['search'] = (apiClient, params) =>
    apiClient.post(SEARCH_PATH, { headers, body: { params }, responseType: 'json' });

  const poll: LogEntriesSearchClient['poll'] = (apiClient, requestId, params) =>
    apiClient.post(`${SEARCH_PATH}/${encodeURIComponent(requestId)}`, {
      headers,
      body: { params, pollLength: '10s' },
      responseType: 'json',
    });

  const searchToCompletion: LogEntriesSearchClient['searchToCompletion'] = async (
    apiClient,
    params
  ) => {
    let response = await search(apiClient, params);
    while (response.statusCode === 200 && response.body.isRunning) {
      response = await poll(apiClient, response.body.id, params);
    }
    return response;
  };

  return { search, poll, searchToCompletion };
};
