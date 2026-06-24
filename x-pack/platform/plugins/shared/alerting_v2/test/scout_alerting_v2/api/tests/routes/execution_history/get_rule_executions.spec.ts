/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  ALERTING_V2_EXECUTION_HISTORY_ALL_ROLE,
  ALERTING_V2_EXECUTION_HISTORY_READ_ROLE,
  ALL_ROLE,
  apiTest,
  buildCreateRuleData,
  getRuleExecutionsUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

apiTest.describe('Get rule executions API', { tag: '@local-stateful-classic' }, () => {
  let readerCredentials: RoleApiCredentials;
  let readerHeaders: Record<string, string>;
  let allCredentials: RoleApiCredentials;
  let allHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    readerCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_EXECUTION_HISTORY_READ_ROLE
    );
    readerHeaders = { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader };

    // We need rules.write to create the rule used in the happy-path test.
    allCredentials = await requestAuth.getApiKeyForCustomRole(ALL_ROLE);
    allHeaders = { ...testData.COMMON_HEADERS, ...allCredentials.apiKeyHeader };
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest(
    'happy path: returns at least one execution record after the rule executor runs',
    async ({ apiServices, apiClient }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'get-rule-executions-smoke' } })
      );

      await apiServices.alertingV2.ruleExecutions.waitForRuns({ ruleId: rule.id, runs: 1 });

      const response = await apiClient.get(getRuleExecutionsUrl({ ruleIds: [rule.id] }), {
        headers: allHeaders,
      });
      expect(response).toHaveStatusCode(200);

      expect(response.body.items.length).toBeGreaterThanOrEqual(1);
      for (const item of response.body.items) {
        expect(item.rule.id).toBe(rule.id);
        expect(item.spaceId).toBe('default');
        expect(typeof item.startedAt).toBe('string');
        expect(typeof item.endedAt).toBe('string');
        expect(['success', 'failure']).toContain(item.outcome);
        expect(typeof item.timings.duration).toBe('number');
        expect(typeof item.timings.scheduledDelay).toBe('number');
      }

      const successful = response.body.items.find(
        (item: { outcome: string }) => item.outcome === 'success'
      );

      expect(successful).toBeDefined();
    }
  );

  apiTest('validation: rejects page=0', async ({ apiClient }) => {
    const response = await apiClient.get(getRuleExecutionsUrl({ page: 0 }), {
      headers: readerHeaders,
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects perPage=0', async ({ apiClient }) => {
    const response = await apiClient.get(getRuleExecutionsUrl({ perPage: 0 }), {
      headers: readerHeaders,
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects perPage above the maximum', async ({ apiClient }) => {
    const response = await apiClient.get(getRuleExecutionsUrl({ perPage: 101 }), {
      headers: readerHeaders,
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects unknown outcome values', async ({ apiClient }) => {
    const response = await apiClient.get(`${getRuleExecutionsUrl()}?outcome=cancelled`, {
      headers: readerHeaders,
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects malformed datetimes for from', async ({ apiClient }) => {
    const response = await apiClient.get(`${getRuleExecutionsUrl()}?from=yesterday`, {
      headers: readerHeaders,
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: 200 with alerting_v2_execution_history read privilege',
    async ({ apiClient }) => {
      const response = await apiClient.get(getRuleExecutionsUrl(), { headers: readerHeaders });
      expect(response).toHaveStatusCode(200);
    }
  );

  apiTest(
    'authorization: 200 with alerting_v2_execution_history all privilege',
    async ({ apiClient, requestAuth }) => {
      const writerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_EXECUTION_HISTORY_ALL_ROLE
      );
      const response = await apiClient.get(getRuleExecutionsUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader },
      });
      expect(response).toHaveStatusCode(200);
    }
  );

  apiTest(
    'authorization: 403 without any alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.get(getRuleExecutionsUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
      });
      expect(response).toHaveStatusCode(403);
    }
  );
});
