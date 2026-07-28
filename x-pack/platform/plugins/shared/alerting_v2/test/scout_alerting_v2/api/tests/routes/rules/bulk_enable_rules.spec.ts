/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { ID_MAX_LENGTH, MAX_BULK_ITEMS } from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_RULES_ALL_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildCreateRuleData,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

const BULK_ENABLE_URL = `${testData.RULE_API_PATH}/_bulk_enable`;

apiTest.describe('Bulk enable rules by IDs API', { tag: '@local-stateful-classic' }, () => {
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

  apiTest('enable: should enable rules by ids', async ({ apiClient, apiServices }) => {
    const ruleA = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'rule-a' } })
    );
    const ruleB = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'rule-b' } })
    );
    // Start both rules disabled so the endpoint has actual work to do.
    await apiServices.alertingV2.rules.bulkDisable({ ids: [ruleA.id, ruleB.id] });
    const response = await apiClient.post(BULK_ENABLE_URL, {
      headers: writerHeaders,
      body: { ids: [ruleA.id, ruleB.id] },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ affected_count: 2, errors: [] });
    // Verify the side effect: both rules are now enabled.
    const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
    expect(remaining.items.every((rule) => rule.enabled)).toBe(true);
  });

  apiTest(
    'enable: should be idempotent when called on already-enabled rules',
    async ({ apiClient, apiServices }) => {
      // Created rules are enabled by default — no `bulkDisable` here.
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'already-enabled' } })
      );
      const response = await apiClient.post(BULK_ENABLE_URL, {
        headers: writerHeaders,
        body: { ids: [rule.id] },
      });
      expect(response).toHaveStatusCode(200);
      // Already-enabled rules still count as affected: the operation is
      // idempotent and clients should not have to special-case them.
      expect(response.body).toStrictEqual({ affected_count: 1, errors: [] });
      const stored = await apiServices.alertingV2.rules.get(rule.id);
      expect(stored.enabled).toBe(true);
    }
  );

  apiTest(
    'enable: should report unknown ids in the errors array with RULE_NOT_FOUND code',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'existing-rule' } })
      );
      await apiServices.alertingV2.rules.bulkDisable({ ids: [rule.id] });
      const response = await apiClient.post(BULK_ENABLE_URL, {
        headers: writerHeaders,
        body: { ids: [rule.id, 'does-not-exist'] },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(1);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0]).toMatchObject({
        id: 'does-not-exist',
        error: { code: 'RULE_NOT_FOUND' },
      });
    }
  );

  apiTest('validation: should reject an empty ids array', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_ENABLE_URL, {
      headers: writerHeaders,
      body: { ids: [] },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject a body with no ids field', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_ENABLE_URL, {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject unknown fields (strict schema)', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_ENABLE_URL, {
      headers: writerHeaders,
      body: { ids: ['some-id'], unknown: 'value' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject ids longer than ID_MAX_LENGTH', async ({ apiClient }) => {
    const tooLongId = 'a'.repeat(ID_MAX_LENGTH + 1);
    const response = await apiClient.post(BULK_ENABLE_URL, {
      headers: writerHeaders,
      body: { ids: [tooLongId] },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: should reject ids arrays longer than MAX_BULK_ITEMS',
    async ({ apiClient }) => {
      const ids = Array.from({ length: MAX_BULK_ITEMS + 1 }, (_, i) => `id-${i}`);
      const response = await apiClient.post(BULK_ENABLE_URL, {
        headers: writerHeaders,
        body: { ids },
      });
      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest(
    'authorization: should return 200 for a user with full alerting_v2 privileges',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'writer-can-enable' } })
      );
      await apiServices.alertingV2.rules.bulkDisable({ ids: [rule.id] });
      const response = await apiClient.post(BULK_ENABLE_URL, {
        headers: writerHeaders,
        body: { ids: [rule.id] },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ affected_count: 1, errors: [] });
    }
  );

  apiTest(
    'authorization: should return 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'reader-cannot-enable' } })
      );
      await apiServices.alertingV2.rules.bulkDisable({ ids: [rule.id] });
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_READ_ROLE
      );
      const response = await apiClient.post(BULK_ENABLE_URL, {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { ids: [rule.id] },
      });
      expect(response).toHaveStatusCode(403);
      // Verify the rule remained disabled after the failed call.
      const stored = await apiServices.alertingV2.rules.get(rule.id);
      expect(stored.enabled).toBe(false);
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'noaccess-cannot-enable' } })
      );
      await apiServices.alertingV2.rules.bulkDisable({ ids: [rule.id] });
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.post(BULK_ENABLE_URL, {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { ids: [rule.id] },
      });
      expect(response).toHaveStatusCode(403);
      const stored = await apiServices.alertingV2.rules.get(rule.id);
      expect(stored.enabled).toBe(false);
    }
  );
});
