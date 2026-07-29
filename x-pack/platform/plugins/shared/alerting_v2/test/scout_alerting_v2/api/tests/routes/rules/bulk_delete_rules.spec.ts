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

const BULK_DELETE_URL = `${testData.RULE_API_PATH}/_bulk_delete`;

apiTest.describe('Bulk delete rules by IDs API', { tag: '@local-stateful-classic' }, () => {
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

  apiTest('delete: should delete rules by ids', async ({ apiClient, apiServices }) => {
    const ruleA = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'rule-a' } })
    );
    const ruleB = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'rule-b' } })
    );
    // Seed a third rule that should NOT be deleted.
    const ruleC = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'rule-c' } })
    );
    const response = await apiClient.post(BULK_DELETE_URL, {
      headers: writerHeaders,
      body: { ids: [ruleA.id, ruleB.id] },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ affected_count: 2, errors: [] });
    // Verify the side effect: only rule-c is left.
    const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
    expect(remaining.items.map((rule) => rule.id)).toStrictEqual([ruleC.id]);
  });

  apiTest(
    'delete: should report unknown ids in the errors array with RULE_NOT_FOUND code',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'existing-rule' } })
      );
      const response = await apiClient.post(BULK_DELETE_URL, {
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
      // The existing rule should still have been deleted despite the error.
      const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
      expect(remaining.items.map((r) => r.id)).not.toContain(rule.id);
    }
  );

  apiTest('validation: should reject an empty ids array', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_DELETE_URL, {
      headers: writerHeaders,
      body: { ids: [] },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject a body with no ids field', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_DELETE_URL, {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject unknown fields (strict schema)', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_DELETE_URL, {
      headers: writerHeaders,
      body: { ids: ['some-id'], unknown: 'value' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject ids longer than ID_MAX_LENGTH', async ({ apiClient }) => {
    const tooLongId = 'a'.repeat(ID_MAX_LENGTH + 1);
    const response = await apiClient.post(BULK_DELETE_URL, {
      headers: writerHeaders,
      body: { ids: [tooLongId] },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: should reject ids arrays longer than MAX_BULK_ITEMS',
    async ({ apiClient }) => {
      const ids = Array.from({ length: MAX_BULK_ITEMS + 1 }, (_, i) => `id-${i}`);
      const response = await apiClient.post(BULK_DELETE_URL, {
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
        buildCreateRuleData({ metadata: { name: 'writer-can-delete' } })
      );
      const response = await apiClient.post(BULK_DELETE_URL, {
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
        buildCreateRuleData({ metadata: { name: 'reader-cannot-delete' } })
      );
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_READ_ROLE
      );
      const response = await apiClient.post(BULK_DELETE_URL, {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { ids: [rule.id] },
      });
      expect(response).toHaveStatusCode(403);
      // Verify the rule still exists after the failed call.
      const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
      expect(remaining.items.map((r) => r.id)).toContain(rule.id);
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'noaccess-cannot-delete' } })
      );
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.post(BULK_DELETE_URL, {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { ids: [rule.id] },
      });
      expect(response).toHaveStatusCode(403);
      const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
      expect(remaining.items.map((r) => r.id)).toContain(rule.id);
    }
  );
});
