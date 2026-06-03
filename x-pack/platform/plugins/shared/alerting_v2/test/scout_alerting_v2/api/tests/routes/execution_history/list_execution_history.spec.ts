/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type {
  RoleApiCredentials,
  RequestAuthFixture,
  KibanaRole,
  ElasticsearchRoleDescriptor,
} from '@kbn/scout';
import { POLICY_EXECUTION_HISTORY_MAX_PER_PAGE } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH } from '@kbn/alerting-v2-constants';
import {
  ALERTING_V2_ACTION_POLICIES_ALL_ROLE,
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  ALERTING_V2_ALERTS_ALL_ROLE,
  ALERTING_V2_ALERTS_READ_ROLE,
  ALERTING_V2_EXECUTION_HISTORY_ALL_ROLE,
  ALERTING_V2_EXECUTION_HISTORY_READ_ROLE,
  ALERTING_V2_RULES_ALL_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  getListExecutionHistoryUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

apiTest.describe(
  'List action policy execution history API',
  { tag: '@local-stateful-classic' },
  () => {
    let executionHistoryReaderHeaders: Record<string, string>;
    let executionHistoryWriterHeaders: Record<string, string>;
    let rulesReadHeaders: Record<string, string>;
    let rulesAllHeaders: Record<string, string>;
    let alertsReadHeaders: Record<string, string>;
    let alertsAllHeaders: Record<string, string>;
    let actionPoliciesReadHeaders: Record<string, string>;
    let actionPoliciesAllHeaders: Record<string, string>;
    let noAccessHeaders: Record<string, string>;

    const getCredentials = async (
      requestAuth: RequestAuthFixture,
      role: KibanaRole | ElasticsearchRoleDescriptor
    ): Promise<Record<string, string>> => {
      const credentials: RoleApiCredentials = await requestAuth.getApiKeyForCustomRole(role);
      return { ...credentials.apiKeyHeader };
    };

    apiTest.beforeAll(async ({ requestAuth }) => {
      executionHistoryReaderHeaders = await getCredentials(
        requestAuth,
        ALERTING_V2_EXECUTION_HISTORY_READ_ROLE
      );
      executionHistoryWriterHeaders = await getCredentials(
        requestAuth,
        ALERTING_V2_EXECUTION_HISTORY_ALL_ROLE
      );
      rulesReadHeaders = await getCredentials(requestAuth, ALERTING_V2_RULES_READ_ROLE);
      rulesAllHeaders = await getCredentials(requestAuth, ALERTING_V2_RULES_ALL_ROLE);
      alertsReadHeaders = await getCredentials(requestAuth, ALERTING_V2_ALERTS_READ_ROLE);
      alertsAllHeaders = await getCredentials(requestAuth, ALERTING_V2_ALERTS_ALL_ROLE);
      actionPoliciesReadHeaders = await getCredentials(
        requestAuth,
        ALERTING_V2_ACTION_POLICIES_READ_ROLE
      );
      actionPoliciesAllHeaders = await getCredentials(
        requestAuth,
        ALERTING_V2_ACTION_POLICIES_ALL_ROLE
      );
      noAccessHeaders = await getCredentials(requestAuth, NO_ACCESS_ROLE);
    });

    apiTest(
      'authorization: 200 with alerting_v2_execution_history read privilege',
      async ({ apiClient }) => {
        const response = await apiClient.get(getListExecutionHistoryUrl(), {
          headers: { ...testData.COMMON_HEADERS, ...executionHistoryReaderHeaders },
        });
        expect(response).toHaveStatusCode(200);
      }
    );

    apiTest(
      'authorization: 200 with alerting_v2_execution_history all privilege',
      async ({ apiClient }) => {
        const response = await apiClient.get(getListExecutionHistoryUrl(), {
          headers: { ...testData.COMMON_HEADERS, ...executionHistoryWriterHeaders },
        });
        expect(response).toHaveStatusCode(200);
      }
    );

    apiTest('authorization: 403 without any alerting_v2 privileges', async ({ apiClient }) => {
      const response = await apiClient.get(getListExecutionHistoryUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessHeaders },
      });
      expect(response).toHaveStatusCode(403);
    });

    apiTest(
      'authorization: 403 with only alerting_v2_action_policies read privilege (regression: privilege no longer leaks via action policies)',
      async ({ apiClient }) => {
        const response = await apiClient.get(getListExecutionHistoryUrl(), {
          headers: { ...testData.COMMON_HEADERS, ...actionPoliciesReadHeaders },
        });
        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      'authorization: 403 with only alerting_v2_action_policies all privilege',
      async ({ apiClient }) => {
        const response = await apiClient.get(getListExecutionHistoryUrl(), {
          headers: { ...testData.COMMON_HEADERS, ...actionPoliciesAllHeaders },
        });
        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      'authorization: 403 with only alerting_v2_rules read privilege',
      async ({ apiClient }) => {
        const response = await apiClient.get(getListExecutionHistoryUrl(), {
          headers: { ...testData.COMMON_HEADERS, ...rulesReadHeaders },
        });
        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      'authorization: 403 with only alerting_v2_rules all privilege',
      async ({ apiClient }) => {
        const response = await apiClient.get(getListExecutionHistoryUrl(), {
          headers: { ...testData.COMMON_HEADERS, ...rulesAllHeaders },
        });
        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      'authorization: 403 with only alerting_v2_alerts read privilege',
      async ({ apiClient }) => {
        const response = await apiClient.get(getListExecutionHistoryUrl(), {
          headers: { ...testData.COMMON_HEADERS, ...alertsReadHeaders },
        });
        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      'authorization: 403 with only alerting_v2_alerts all privilege',
      async ({ apiClient }) => {
        const response = await apiClient.get(getListExecutionHistoryUrl(), {
          headers: { ...testData.COMMON_HEADERS, ...alertsAllHeaders },
        });
        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest('returns documented defaults when no history exists', async ({ apiClient }) => {
      const response = await apiClient.get(getListExecutionHistoryUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...executionHistoryReaderHeaders },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        items: [],
        page: 1,
        perPage: POLICY_EXECUTION_HISTORY_MAX_PER_PAGE,
        totalEvents: 0,
      });
    });

    apiTest('echoes explicit page and perPage in the response', async ({ apiClient }) => {
      const response = await apiClient.get(getListExecutionHistoryUrl({ page: 3, perPage: 25 }), {
        headers: { ...testData.COMMON_HEADERS, ...executionHistoryReaderHeaders },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.page).toBe(3);
      expect(response.body.perPage).toBe(25);
      expect(response.body.items).toStrictEqual([]);
      expect(response.body.totalEvents).toBe(0);
    });

    apiTest('validation: rejects page=0', async ({ apiClient }) => {
      const response = await apiClient.get(getListExecutionHistoryUrl({ page: 0 }), {
        headers: { ...testData.COMMON_HEADERS, ...executionHistoryReaderHeaders },
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('validation: rejects perPage=0', async ({ apiClient }) => {
      const response = await apiClient.get(getListExecutionHistoryUrl({ perPage: 0 }), {
        headers: { ...testData.COMMON_HEADERS, ...executionHistoryReaderHeaders },
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('validation: accepts perPage at the maximum', async ({ apiClient }) => {
      const response = await apiClient.get(
        getListExecutionHistoryUrl({ perPage: POLICY_EXECUTION_HISTORY_MAX_PER_PAGE }),
        { headers: { ...testData.COMMON_HEADERS, ...executionHistoryReaderHeaders } }
      );
      expect(response).toHaveStatusCode(200);
      expect(response.body.perPage).toBe(POLICY_EXECUTION_HISTORY_MAX_PER_PAGE);
    });

    apiTest('validation: rejects perPage above the maximum', async ({ apiClient }) => {
      const response = await apiClient.get(
        getListExecutionHistoryUrl({ perPage: POLICY_EXECUTION_HISTORY_MAX_PER_PAGE + 1 }),
        { headers: { ...testData.COMMON_HEADERS, ...executionHistoryReaderHeaders } }
      );
      expect(response).toHaveStatusCode(400);
    });

    apiTest('validation: rejects non-numeric perPage', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH}?perPage=banana`,
        { headers: { ...testData.COMMON_HEADERS, ...executionHistoryReaderHeaders } }
      );
      expect(response).toHaveStatusCode(400);
    });

    apiTest('validation: rejects non-numeric page', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH}?page=banana`,
        { headers: { ...testData.COMMON_HEADERS, ...executionHistoryReaderHeaders } }
      );
      expect(response).toHaveStatusCode(400);
    });
  }
);
