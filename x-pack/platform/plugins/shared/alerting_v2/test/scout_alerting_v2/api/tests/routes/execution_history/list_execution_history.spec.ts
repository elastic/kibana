/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  EXECUTION_HISTORY_MAX_PER_PAGE,
  EXECUTION_HISTORY_MAX_RESULT_WINDOW,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH } from '@kbn/alerting-v2-constants';
import {
  ALERTING_V2_EXECUTION_HISTORY_ALL_ROLE,
  ALERTING_V2_EXECUTION_HISTORY_READ_ROLE,
  apiTest,
  getListExecutionHistoryUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

apiTest.describe(
  'List action policy execution history API',
  { tag: '@local-stateful-classic' },
  () => {
    let readerCredentials: RoleApiCredentials;
    let readerHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_EXECUTION_HISTORY_READ_ROLE
      );
      readerHeaders = { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader };
    });

    apiTest('validation: rejects page=0', async ({ apiClient }) => {
      const response = await apiClient.get(getListExecutionHistoryUrl({ page: 0 }), {
        headers: readerHeaders,
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    });

    apiTest('validation: accepts perPage=0 (count-only read)', async ({ apiClient }) => {
      const response = await apiClient.get(getListExecutionHistoryUrl({ per_page: 0 }), {
        headers: readerHeaders,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.perPage).toBe(0);
      expect(response.body.items).toStrictEqual([]);
    });

    apiTest('validation: accepts perPage at the maximum', async ({ apiClient }) => {
      const response = await apiClient.get(
        getListExecutionHistoryUrl({ per_page: EXECUTION_HISTORY_MAX_PER_PAGE }),
        { headers: readerHeaders }
      );
      expect(response).toHaveStatusCode(200);
      expect(response.body.perPage).toBe(EXECUTION_HISTORY_MAX_PER_PAGE);
    });

    apiTest('validation: rejects perPage above the maximum', async ({ apiClient }) => {
      const response = await apiClient.get(
        getListExecutionHistoryUrl({ per_page: EXECUTION_HISTORY_MAX_PER_PAGE + 1 }),
        { headers: readerHeaders }
      );
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    });

    apiTest('validation: rejects page * perPage above the result window', async ({ apiClient }) => {
      const perPage = EXECUTION_HISTORY_MAX_PER_PAGE;
      const page = Math.floor(EXECUTION_HISTORY_MAX_RESULT_WINDOW / perPage) + 1;
      const response = await apiClient.get(
        getListExecutionHistoryUrl({ page, per_page: perPage }),
        {
          headers: readerHeaders,
        }
      );
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    });

    apiTest('validation: accepts a start_date lower bound', async ({ apiClient }) => {
      const response = await apiClient.get(
        getListExecutionHistoryUrl({ start_date: '2026-01-01T00:00:00.000Z' }),
        { headers: readerHeaders }
      );
      expect(response).toHaveStatusCode(200);
    });

    apiTest('validation: accepts an outcome array filter', async ({ apiClient }) => {
      const response = await apiClient.get(
        getListExecutionHistoryUrl({ outcome: ['dispatched', 'throttled'] }),
        { headers: readerHeaders }
      );
      expect(response).toHaveStatusCode(200);
    });

    apiTest('validation: rejects an unknown outcome value', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH}?outcome=nope`,
        { headers: readerHeaders }
      );
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    });

    apiTest('validation: rejects non-numeric perPage', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH}?per_page=banana`,
        { headers: readerHeaders }
      );
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    });

    apiTest('validation: rejects non-numeric page', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH}?page=banana`,
        { headers: readerHeaders }
      );
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    });

    apiTest(
      'authorization: 200 with alerting_v2_execution_history read privilege',
      async ({ apiClient }) => {
        const response = await apiClient.get(getListExecutionHistoryUrl(), {
          headers: readerHeaders,
        });
        expect(response).toHaveStatusCode(200);
      }
    );

    apiTest(
      'authorization: 200 with alerting_v2_execution_history all privilege',
      async ({ apiClient, requestAuth }) => {
        const writerCredentials = await requestAuth.getApiKeyForCustomRole(
          ALERTING_V2_EXECUTION_HISTORY_ALL_ROLE
        );
        const response = await apiClient.get(getListExecutionHistoryUrl(), {
          headers: { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader },
        });
        expect(response).toHaveStatusCode(200);
      }
    );

    apiTest(
      'authorization: 403 without any alerting_v2 privileges',
      async ({ apiClient, requestAuth }) => {
        const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
        const response = await apiClient.get(getListExecutionHistoryUrl(), {
          headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        });
        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
