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
} from '../fixtures';

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
    const remaining = await apiServices.alertingV2.rules.find({ per_page: 100 });
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
      const remaining = await apiServices.alertingV2.rules.find({ per_page: 100 });
      expect(remaining.items.map((r) => r.id)).not.toContain(rule.id);
    }
  );

  apiTest('validation: should reject an empty ids array', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_DELETE_URL, {
      headers: writerHeaders,
      body: { ids: [] },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: should reject a body with no ids field', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_DELETE_URL, {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: should reject unknown fields (strict schema)', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_DELETE_URL, {
      headers: writerHeaders,
      body: { ids: ['some-id'], unknown: 'value' },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: should reject ids longer than ID_MAX_LENGTH', async ({ apiClient }) => {
    const tooLongId = 'a'.repeat(ID_MAX_LENGTH + 1);
    const response = await apiClient.post(BULK_DELETE_URL, {
      headers: writerHeaders,
      body: { ids: [tooLongId] },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
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
      expect(response.body.code).toBe('BAD_REQUEST');
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
      const remaining = await apiServices.alertingV2.rules.find({ per_page: 100 });
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
      const remaining = await apiServices.alertingV2.rules.find({ per_page: 100 });
      expect(remaining.items.map((r) => r.id)).toContain(rule.id);
    }
  );

  // ---------------------------------------------------------------------------
  // Step 5.3: managed-rule write gate on the bulk-delete path
  //
  // Managed rules are refused per-item with RULE_IS_MANAGED. A mixed batch
  // (managed + unmanaged) deletes exactly the unmanaged ones and reports an
  // error for each managed rule.
  //
  // To simulate a managed rule without a registered managed builder type, we
  // create a plain rule then patch its stored ownership directly in ES. This
  // matches how a model-version backfill would stamp existing rules.
  //
  // Ref: rule-ownership.md "Path by path"
  // ---------------------------------------------------------------------------

  apiTest(
    'managed-rule gate: should refuse a managed rule with RULE_IS_MANAGED and leave it intact',
    async ({ apiClient, apiServices }) => {
      const managedRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'managed-rule' } })
      );
      try {
        // Stamp managed ownership directly — the generic API has no identity so
        // cannot create a managed rule through the create endpoint.
        await apiServices.alertingV2.ruleSavedObject.setOwnership(managedRule.id, {
          managed: true,
          solution: 'security',
          domain: 'detection',
        });

        const response = await apiClient.post(BULK_DELETE_URL, {
          headers: writerHeaders,
          body: { ids: [managedRule.id] },
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.affected_count).toBe(0);
        expect(response.body.errors).toHaveLength(1);
        expect(response.body.errors[0]).toMatchObject({
          id: managedRule.id,
          error: { code: 'RULE_IS_MANAGED' },
        });
        // The rule must still exist.
        const remaining = await apiServices.alertingV2.rules.find({ per_page: 100 });
        expect(remaining.items.map((r) => r.id)).toContain(managedRule.id);
      } finally {
        // Un-manage so the normal cleanup can delete this rule.
        await apiServices.alertingV2.ruleSavedObject.setOwnership(managedRule.id, {
          managed: false,
        });
      }
    }
  );

  apiTest(
    'managed-rule gate: should delete unmanaged rules and refuse managed ones in a mixed batch',
    async ({ apiClient, apiServices }) => {
      const managedRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'managed-in-batch' } })
      );
      const unmanagedRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'unmanaged-in-batch' } })
      );
      try {
        await apiServices.alertingV2.ruleSavedObject.setOwnership(managedRule.id, {
          managed: true,
          solution: 'security',
          domain: 'detection',
        });

        const response = await apiClient.post(BULK_DELETE_URL, {
          headers: writerHeaders,
          body: { ids: [managedRule.id, unmanagedRule.id] },
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.affected_count).toBe(1);
        expect(response.body.errors).toHaveLength(1);
        expect(response.body.errors[0]).toMatchObject({
          id: managedRule.id,
          error: { code: 'RULE_IS_MANAGED' },
        });
        // The unmanaged rule is gone; the managed one remains.
        const remaining = await apiServices.alertingV2.rules.find({ per_page: 100 });
        const remainingIds = remaining.items.map((r) => r.id);
        expect(remainingIds).toContain(managedRule.id);
        expect(remainingIds).not.toContain(unmanagedRule.id);
      } finally {
        // Un-manage so the normal cleanup can delete this rule.
        await apiServices.alertingV2.ruleSavedObject.setOwnership(managedRule.id, {
          managed: false,
        });
      }
    }
  );
});
