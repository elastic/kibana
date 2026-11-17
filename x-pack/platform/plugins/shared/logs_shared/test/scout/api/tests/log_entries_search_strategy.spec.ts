/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { LogViewAttributes, LogViewColumnConfiguration } from '../../../../common/log_views';
import {
  LOG_ENTRIES_MAX_COLUMNS,
  LOG_ENTRIES_MAX_SIZE,
  LOG_ENTRIES_SEARCH_STRATEGY,
} from '../../../../common/search_strategies/log_entries/log_entries';
import { apiTest, testData } from '../fixtures';

const SEARCH_PATH = `internal/search/${LOG_ENTRIES_SEARCH_STRATEGY}`;
const LOG_INDEX = 'scout-log-entries';
const PERSISTED_LOG_VIEW_ID = 'scout-wide-log-view';
const START_TIMESTAMP = Date.parse('2026-01-01T00:00:00.000Z');
const END_TIMESTAMP = Date.parse('2026-01-01T01:00:00.000Z');
const DOCUMENT_COUNT = 3;

const createColumns = (count: number): LogViewColumnConfiguration[] => [
  { timestampColumn: { id: 'timestamp' } },
  { messageColumn: { id: 'message' } },
  ...Array.from({ length: count - 2 }, (_, index) => ({
    fieldColumn: { id: `field-${index}`, field: 'event.dataset' },
  })),
];

const createLogViewAttributes = (columnCount: number): LogViewAttributes => ({
  name: 'Scout log view',
  description: '',
  logIndices: { type: 'index_name', indexName: LOG_INDEX },
  logColumns: createColumns(columnCount),
});

const baseParams = {
  logView: { type: 'log-view-reference', logViewId: PERSISTED_LOG_VIEW_ID },
  startTimestamp: START_TIMESTAMP,
  endTimestamp: END_TIMESTAMP,
  size: 200,
};

apiTest.describe(
  'Log entries search strategy limits',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ esClient, kbnClient, samlAuth }) => {
      await esClient.indices.create({
        index: LOG_INDEX,
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
        operations: Array.from({ length: DOCUMENT_COUNT }, (_, index) => [
          { index: { _index: LOG_INDEX } },
          {
            '@timestamp': new Date(START_TIMESTAMP + (index + 1) * 60_000).toISOString(),
            message: `log message ${index}`,
            'event.dataset': 'scout.log',
          },
        ]).flat(),
      });

      await kbnClient.request({
        method: 'PUT',
        path: `/api/infra/log_views/${PERSISTED_LOG_VIEW_ID}`,
        headers: { 'elastic-api-version': '1', 'x-elastic-internal-origin': 'kibana' },
        body: { attributes: createLogViewAttributes(LOG_ENTRIES_MAX_COLUMNS + 1) },
      });

      ({ cookieHeader } = await samlAuth.asInteractiveUser('viewer'));
    });

    apiTest.afterAll(async ({ esClient, kbnClient }) => {
      await esClient.indices.delete({ index: LOG_INDEX, ignore_unavailable: true });
      await kbnClient.savedObjects.delete({
        type: 'infrastructure-monitoring-log-view',
        id: PERSISTED_LOG_VIEW_ID,
      });
    });

    apiTest(
      'returns entries for a persisted log view with more columns than the request limit',
      async ({ apiClient }) => {
        const response = await apiClient.post(SEARCH_PATH, {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          body: { params: baseParams },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { entries } = response.body.rawResponse.data;
        expect(entries).toHaveLength(DOCUMENT_COUNT);
        expect(entries[0].columns).toHaveLength(LOG_ENTRIES_MAX_COLUMNS + 1);
      }
    );

    apiTest('returns entries for an inline log view at the column limit', async ({ apiClient }) => {
      const response = await apiClient.post(SEARCH_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        body: {
          params: {
            ...baseParams,
            logView: {
              type: 'log-view-inline',
              id: 'scout-inline-log-view',
              attributes: createLogViewAttributes(LOG_ENTRIES_MAX_COLUMNS),
            },
          },
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.rawResponse.data.entries).toHaveLength(DOCUMENT_COUNT);
    });

    apiTest('rejects a size above the limit', async ({ apiClient }) => {
      const response = await apiClient.post(SEARCH_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        body: { params: { ...baseParams, size: LOG_ENTRIES_MAX_SIZE + 1 } },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('rejects request columns above the limit', async ({ apiClient }) => {
      const response = await apiClient.post(SEARCH_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        body: { params: { ...baseParams, columns: createColumns(LOG_ENTRIES_MAX_COLUMNS + 1) } },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(
        `Expected at most ${LOG_ENTRIES_MAX_COLUMNS} columns, got ${LOG_ENTRIES_MAX_COLUMNS + 1}`
      );
    });

    apiTest('rejects an inline log view with columns above the limit', async ({ apiClient }) => {
      const response = await apiClient.post(SEARCH_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        body: {
          params: {
            ...baseParams,
            logView: {
              type: 'log-view-inline',
              id: 'scout-inline-log-view',
              attributes: createLogViewAttributes(LOG_ENTRIES_MAX_COLUMNS + 1),
            },
          },
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(
        `Expected at most ${LOG_ENTRIES_MAX_COLUMNS} columns, got ${LOG_ENTRIES_MAX_COLUMNS + 1}`
      );
    });

    apiTest('rejects a polling request with columns above the limit', async ({ apiClient }) => {
      const requestId = Buffer.from(JSON.stringify({ esRequestId: 'scout-request-id' })).toString(
        'base64'
      );
      const response = await apiClient.post(`${SEARCH_PATH}/${encodeURIComponent(requestId)}`, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        body: { params: { ...baseParams, columns: createColumns(LOG_ENTRIES_MAX_COLUMNS + 1) } },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });
  }
);
