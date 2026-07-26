/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_COUNT_API_PATH } from '@kbn/alerting-v2-constants';
import {
  ALERTING_V2_EXECUTION_HISTORY_ALL_ROLE,
  ALERTING_V2_EXECUTION_HISTORY_READ_ROLE,
  apiTest,
  getCountNewExecutionHistoryEventsUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

const SINCE_ISO = '1970-01-01T00:00:00.000Z';

apiTest.describe(
  'Count new action policy execution events API',
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

    apiTest('validation: rejects missing since', async ({ apiClient }) => {
      const response = await apiClient.get(
        ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_COUNT_API_PATH,
        { headers: readerHeaders }
      );
      expect(response).toHaveStatusCode(400);
    });

    apiTest(
      'authorization: 200 with alerting_v2_execution_history read privilege',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          getCountNewExecutionHistoryEventsUrl({ since: SINCE_ISO }),
          { headers: readerHeaders }
        );
        expect(response).toHaveStatusCode(200);
      }
    );

    apiTest(
      'authorization: 200 with alerting_v2_execution_history all privilege',
      async ({ apiClient, requestAuth }) => {
        const writerCredentials = await requestAuth.getApiKeyForCustomRole(
          ALERTING_V2_EXECUTION_HISTORY_ALL_ROLE
        );
        const response = await apiClient.get(
          getCountNewExecutionHistoryEventsUrl({ since: SINCE_ISO }),
          { headers: { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader } }
        );
        expect(response).toHaveStatusCode(200);
      }
    );

    apiTest(
      'authorization: 403 without any alerting_v2 privileges',
      async ({ apiClient, requestAuth }) => {
        const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
        const response = await apiClient.get(
          getCountNewExecutionHistoryEventsUrl({ since: SINCE_ISO }),
          { headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader } }
        );
        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
