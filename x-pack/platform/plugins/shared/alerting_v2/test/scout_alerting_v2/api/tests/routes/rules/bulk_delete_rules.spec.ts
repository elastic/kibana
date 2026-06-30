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
  expectNoBulkTruncationMetadata,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

const BULK_DELETE_URL = `${testData.RULE_API_PATH}/_bulk_delete`;

apiTest.describe('Bulk delete rules API', { tag: '@local-stateful-classic' }, () => {
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
    // Bulk delete intentionally returns an empty `rules` array; deleted
    // rules are not echoed back.
    expect(response.body.rules).toStrictEqual([]);
    expect(response.body.errors).toStrictEqual([]);
    expectNoBulkTruncationMetadata(response.body);
    // Verify the side effect: only rule-c is left.
    const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
    expect(remaining.items.map((rule) => rule.id)).toStrictEqual([ruleC.id]);
  });

  apiTest(
    'delete: should delete all rules with match_all: true',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-a' } })
      );
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-b' } })
      );
      const response = await apiClient.post(BULK_DELETE_URL, {
        headers: writerHeaders,
        body: { match_all: true },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.errors).toStrictEqual([]);
      const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
      expect(remaining.total).toBe(0);
      expect(remaining.items).toStrictEqual([]);
    }
  );

  apiTest(
    'delete: should delete only rules matching the filter',
    async ({ apiClient, apiServices }) => {
      const prodRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'prod-rule', tags: ['production'] } })
      );
      const devRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'dev-rule', tags: ['development'] } })
      );
      const response = await apiClient.post(BULK_DELETE_URL, {
        headers: writerHeaders,
        body: { filter: 'metadata.tags: "production"' },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.errors).toStrictEqual([]);
      // The dev rule should remain; the prod rule should be gone.
      const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
      const remainingIds = remaining.items.map((rule) => rule.id);
      expect(remainingIds).toStrictEqual([devRule.id]);
      expect(remainingIds).not.toContain(prodRule.id);
    }
  );

  apiTest(
    'delete: should report unknown ids in the errors array',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'existing-rule' } })
      );
      const response = await apiClient.post(BULK_DELETE_URL, {
        headers: writerHeaders,
        body: { ids: [rule.id, 'does-not-exist'] },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.rules).toStrictEqual([]);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0]).toMatchObject({
        id: 'does-not-exist',
        error: { statusCode: 404 },
      });
      // The existing rule should still have been deleted despite the error.
      const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
      expect(remaining.items.map((r) => r.id)).not.toContain(rule.id);
    }
  );

  apiTest(
    'delete: should return 200 with empty results when filter matches nothing',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'survivor' } })
      );

      const response = await apiClient.post(BULK_DELETE_URL, {
        headers: writerHeaders,
        body: { filter: 'metadata.name: nonexistent-rule-xyz' },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.rules).toStrictEqual([]);
      expect(response.body.errors).toStrictEqual([]);
      expectNoBulkTruncationMetadata(response.body);

      // The survivor must still be present.
      const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
      expect(remaining.total).toBe(1);
    }
  );

  apiTest('validation: should reject an empty ids array', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_DELETE_URL, {
      headers: writerHeaders,
      body: { ids: [] },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject body without any selector', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_DELETE_URL, {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject combining ids with filter', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_DELETE_URL, {
      headers: writerHeaders,
      body: { ids: ['some-id'], filter: 'metadata.tags: "x"' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject combining match_all with ids', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_DELETE_URL, {
      headers: writerHeaders,
      body: { match_all: true, ids: ['some-id'] },
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
      expect(response.body.errors).toStrictEqual([]);
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
