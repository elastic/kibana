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
import {
  DOCUMENT_COUNT,
  END_TIMESTAMP,
  START_TIMESTAMP,
  createLogIndex,
  createLogViewAttributes,
  searchLogEntriesToCompletion,
} from '../fixtures/log_entries';

// Log view saved objects and their PUT route are not registered in Serverless.
apiTest.describe(
  'Log entries search strategy with a persisted log view',
  { tag: tags.stateful.classic },
  () => {
    const runId = randomUUID();
    const logIndex = `scout-log-entries-${runId}`;
    const logViewId = `scout-wide-log-view-${runId}`;
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ esClient, kbnClient, samlAuth }) => {
      await createLogIndex(esClient, logIndex);
      await kbnClient.request({
        method: 'PUT',
        path: `/api/infra/log_views/${logViewId}`,
        headers: { 'elastic-api-version': '1', 'x-elastic-internal-origin': 'kibana' },
        body: { attributes: createLogViewAttributes(logIndex, LOG_ENTRIES_MAX_COLUMNS + 1) },
      });
      ({ cookieHeader } = await samlAuth.asInteractiveUser('viewer'));
    });

    apiTest.afterAll(async ({ esClient, kbnClient }) => {
      await esClient.indices.delete({ index: logIndex, ignore_unavailable: true });
      await kbnClient.savedObjects.delete({
        type: 'infrastructure-monitoring-log-view',
        id: logViewId,
      });
    });

    apiTest(
      'returns entries for a persisted log view with more columns than the request limit',
      async ({ apiClient }) => {
        const response = await searchLogEntriesToCompletion(apiClient, cookieHeader, {
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
