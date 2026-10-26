/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  ALERTING_V2_RULES_ALL_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildCreateRuleData,
  getRunRuleUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

// A newly created rule's executor task is due immediately, so Task Manager can
// claim its first run before this call; `_run` then returns 409 (already running
// or a task-doc update conflict). Poll until that first run clears and it accepts.
const expectRunAccepted = (post: () => Promise<{ statusCode: number }>) =>
  expect
    .poll(async () => (await post()).statusCode, {
      timeout: testData.POLL_TIMEOUT_MS,
      intervals: [testData.POLL_INTERVAL_MS],
    })
    .toBe(202);

apiTest.describe('Run rule API', { tag: testData.API_ENGINE_TAG }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_RULES_ALL_ROLE);
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest('run: returns 202 for an enabled rule', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'rule-to-run' } })
    );
    await expectRunAccepted(() =>
      apiClient.post(getRunRuleUrl(created.id), { headers: writerHeaders })
    );
  });

  apiTest('status: returns 404 when the rule does not exist', async ({ apiClient }) => {
    const response = await apiClient.post(getRunRuleUrl('does-not-exist'), {
      headers: writerHeaders,
    });
    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('RULE_NOT_FOUND');
  });

  apiTest(
    'status: returns 400 RULE_DISABLED when the rule is disabled',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'disabled-rule-to-run' } })
      );
      await apiServices.alertingV2.rules.bulkDisable({ ids: [created.id] });

      const response = await apiClient.post(getRunRuleUrl(created.id), {
        headers: writerHeaders,
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('RULE_DISABLED');
    }
  );

  apiTest(
    'authorization: returns 202 for a user with full alerting_v2 privileges',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'writer-can-run' } })
      );
      await expectRunAccepted(() =>
        apiClient.post(getRunRuleUrl(created.id), { headers: writerHeaders })
      );
    }
  );

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'reader-cannot-run' } })
      );
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_READ_ROLE
      );
      const response = await apiClient.post(getRunRuleUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
      });
      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'noaccess-cannot-run' } })
      );
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.post(getRunRuleUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
      });
      expect(response).toHaveStatusCode(403);
    }
  );
});
