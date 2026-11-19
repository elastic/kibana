/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  LOG_ENTRIES_MAX_COLUMNS,
  LOG_ENTRIES_MAX_SIZE,
} from '../../../../common/search_strategies/log_entries/log_entries';
import { apiTest } from '../fixtures';
import type { LogEntriesSearchClient } from '../fixtures/log_entries';
import {
  DOCUMENT_COUNT,
  END_TIMESTAMP,
  START_TIMESTAMP,
  createColumns,
  createLogViewAttributes,
  getLogEntriesSearchClient,
} from '../fixtures/log_entries';

const COLUMN_LIMIT_ERROR = `Expected at most ${LOG_ENTRIES_MAX_COLUMNS} columns, got ${
  LOG_ENTRIES_MAX_COLUMNS + 1
}`;

apiTest.describe(
  'Log entries search strategy request limits',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const logIndex = `scout-log-entries-${randomUUID()}`;
    let searchClient: LogEntriesSearchClient;

    const createInlineParams = (columnCount: number) => ({
      logView: {
        type: 'log-view-inline',
        id: 'scout-inline-log-view',
        attributes: createLogViewAttributes(logIndex, columnCount),
      },
      startTimestamp: START_TIMESTAMP,
      endTimestamp: END_TIMESTAMP,
      size: 200,
    });

    apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
      await apiServices.logsShared.createLogIndex(logIndex);
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
      searchClient = getLogEntriesSearchClient(cookieHeader);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.logsShared.deleteLogIndex(logIndex);
    });

    apiTest('returns entries for an inline log view at the column limit', async ({ apiClient }) => {
      const response = await searchClient.searchToCompletion(
        apiClient,
        createInlineParams(LOG_ENTRIES_MAX_COLUMNS)
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.isRunning).toBe(false);
      const { entries } = response.body.rawResponse.data;
      expect(entries).toHaveLength(DOCUMENT_COUNT);
      expect(entries[0].columns).toHaveLength(LOG_ENTRIES_MAX_COLUMNS);
    });

    apiTest('rejects a size above the limit', async ({ apiClient }) => {
      const response = await searchClient.search(apiClient, {
        ...createInlineParams(LOG_ENTRIES_MAX_COLUMNS),
        size: LOG_ENTRIES_MAX_SIZE + 1,
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain('size');
    });

    apiTest('rejects request columns above the limit', async ({ apiClient }) => {
      const response = await searchClient.search(apiClient, {
        ...createInlineParams(LOG_ENTRIES_MAX_COLUMNS),
        columns: createColumns(LOG_ENTRIES_MAX_COLUMNS + 1),
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(COLUMN_LIMIT_ERROR);
    });

    apiTest('rejects an inline log view with columns above the limit', async ({ apiClient }) => {
      const response = await searchClient.search(
        apiClient,
        createInlineParams(LOG_ENTRIES_MAX_COLUMNS + 1)
      );

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(COLUMN_LIMIT_ERROR);
    });

    apiTest('rejects a polling request with columns above the limit', async ({ apiClient }) => {
      const requestId = Buffer.from(JSON.stringify({ esRequestId: 'scout-request-id' })).toString(
        'base64'
      );
      const response = await searchClient.poll(
        apiClient,
        requestId,
        createInlineParams(LOG_ENTRIES_MAX_COLUMNS + 1)
      );

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(COLUMN_LIMIT_ERROR);
    });
  }
);
