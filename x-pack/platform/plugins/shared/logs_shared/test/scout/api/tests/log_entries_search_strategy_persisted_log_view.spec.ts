/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { LOG_ENTRIES_MAX_COLUMNS } from '../../../../common/search_strategies/log_entries/log_entries';
import { apiTest } from '../fixtures';
import type { LogEntriesSearchClient } from '../fixtures/log_entries';
import {
  DOCUMENT_COUNT,
  END_TIMESTAMP,
  START_TIMESTAMP,
  createLogViewAttributes,
  getLogEntriesSearchClient,
} from '../fixtures/log_entries';

// Log view saved objects and their PUT route are not registered in Serverless.
apiTest.describe(
  'Log entries search strategy with a persisted log view',
  { tag: tags.stateful.classic },
  () => {
    const runId = randomUUID();
    const logIndex = `scout-log-entries-${runId}`;
    const logViewId = `scout-wide-log-view-${runId}`;
    let searchClient: LogEntriesSearchClient;

    apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
      await apiServices.logsShared.createLogIndex(logIndex);
      await apiServices.logsShared.putLogView(
        logViewId,
        createLogViewAttributes(logIndex, LOG_ENTRIES_MAX_COLUMNS + 1)
      );
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
      searchClient = getLogEntriesSearchClient(cookieHeader);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.logsShared.deleteLogIndex(logIndex);
      await apiServices.logsShared.deleteLogView(logViewId);
    });

    apiTest(
      'returns entries for a persisted log view with more columns than the request limit',
      async ({ apiClient }) => {
        const response = await searchClient.searchToCompletion(apiClient, {
          logView: { type: 'log-view-reference', logViewId },
          startTimestamp: START_TIMESTAMP,
          endTimestamp: END_TIMESTAMP,
          size: 200,
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.isRunning).toBe(false);
        const { entries } = response.body.rawResponse.data;
        expect(entries).toHaveLength(DOCUMENT_COUNT);
        expect(entries[0].columns).toHaveLength(LOG_ENTRIES_MAX_COLUMNS + 1);
      }
    );
  }
);
