/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { POLICY_EXECUTION_HISTORY_MAX_PER_PAGE } from '@kbn/alerting-v2-schemas';
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
    });

    apiTest('validation: rejects perPage=0', async ({ apiClient }) => {
      const response = await apiClient.get(getListExecutionHistoryUrl({ perPage: 0 }), {
        headers: readerHeaders,
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('validation: accepts perPage at the maximum', async ({ apiClient }) => {
      const response = await apiClient.get(
        getListExecutionHistoryUrl({ perPage: POLICY_EXECUTION_HISTORY_MAX_PER_PAGE }),
        { headers: readerHeaders }
      );
      expect(response).toHaveStatusCode(200);
      expect(response.body.perPage).toBe(POLICY_EXECUTION_HISTORY_MAX_PER_PAGE);
    });

    apiTest('validation: rejects perPage above the maximum', async ({ apiClient }) => {
      const response = await apiClient.get(
        getListExecutionHistoryUrl({ perPage: POLICY_EXECUTION_HISTORY_MAX_PER_PAGE + 1 }),
        { headers: readerHeaders }
      );
      expect(response).toHaveStatusCode(400);
    });

    apiTest('validation: rejects non-numeric perPage', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH}?perPage=banana`,
        { headers: readerHeaders }
      );
      expect(response).toHaveStatusCode(400);
    });

    apiTest('validation: rejects non-numeric page', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH}?page=banana`,
        { headers: readerHeaders }
      );
      expect(response).toHaveStatusCode(400);
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
