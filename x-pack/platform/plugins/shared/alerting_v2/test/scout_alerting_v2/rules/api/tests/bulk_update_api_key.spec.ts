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

const BULK_UPDATE_API_KEY_URL = `${testData.RULE_API_PATH}/_bulk_update_api_key`;

apiTest.describe('Bulk update rule API key by IDs API', { tag: '@local-stateful-classic' }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_RULES_ALL_ROLE);
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };

    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest(
    'update: rotates the API key for rules and stamps audit metadata',
    async ({ apiClient, apiServices }) => {
      const ruleA = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-a' } })
      );
      const ruleB = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-b' } })
      );

      const response = await apiClient.post(BULK_UPDATE_API_KEY_URL, {
        headers: writerHeaders,
        body: { ids: [ruleA.id, ruleB.id] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ affected_count: 2, errors: [] });

      // The API key rotation is not observable directly (Task Manager stores it
      // encrypted), so assert the side effect via the saved object write. The
      // OCC `version` is the reliable witness: every successful write bumps it,
      // independently of the clock. `updated_at` is a weaker, clock-dependent
      // proxy kept only as a sanity check that the write advanced the timestamp.
      for (const created of [ruleA, ruleB]) {
        const fetched = await apiServices.alertingV2.rules.get(created.id);
        expect(fetched.version).not.toBe(created.version);
        expect(Date.parse(fetched.updated_at)).toBeGreaterThan(Date.parse(created.updated_at));
      }
    }
  );

  apiTest(
    'state: preserves all rule attributes other than the audit metadata',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'preserve-attrs-rule' } })
      );

      const response = await apiClient.post(BULK_UPDATE_API_KEY_URL, {
        headers: writerHeaders,
        body: { ids: [created.id] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ affected_count: 1, errors: [] });

      const fetched = await apiServices.alertingV2.rules.get(created.id);
      // Rotation neither disables the rule nor changes its configuration.
      expect(fetched.enabled).toBe(true);
      expect(fetched).toStrictEqual({
        ...created,
        updated_at: fetched.updated_at,
        updated_by: fetched.updated_by,
        version: fetched.version,
      });
      expect(fetched.version).not.toBe(created.version);
    }
  );

  apiTest(
    'update: reports unknown ids in the errors array with RULE_NOT_FOUND while rotating the valid ones',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'existing-rule' } })
      );

      const response = await apiClient.post(BULK_UPDATE_API_KEY_URL, {
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
    const response = await apiClient.post(BULK_UPDATE_API_KEY_URL, {
      headers: writerHeaders,
      body: { ids: [] },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: should reject a body with no ids field', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_UPDATE_API_KEY_URL, {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: should reject unknown fields (strict schema)', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_UPDATE_API_KEY_URL, {
      headers: writerHeaders,
      body: { ids: ['some-id'], unknown: 'value' },
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: should reject ids longer than ID_MAX_LENGTH', async ({ apiClient }) => {
    const tooLongId = 'a'.repeat(ID_MAX_LENGTH + 1);
    const response = await apiClient.post(BULK_UPDATE_API_KEY_URL, {
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
      const response = await apiClient.post(BULK_UPDATE_API_KEY_URL, {
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
        buildCreateRuleData({ metadata: { name: 'writer-can-rotate' } })
      );
      const response = await apiClient.post(BULK_UPDATE_API_KEY_URL, {
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
        buildCreateRuleData({ metadata: { name: 'reader-cannot-rotate' } })
      );
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_READ_ROLE
      );
      const response = await apiClient.post(BULK_UPDATE_API_KEY_URL, {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { ids: [rule.id] },
      });
      expect(response).toHaveStatusCode(403);
      // Verify the rule was left untouched after the forbidden call.
      const stored = await apiServices.alertingV2.rules.get(rule.id);
      expect(stored.version).toBe(rule.version);
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'noaccess-cannot-rotate' } })
      );
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.post(BULK_UPDATE_API_KEY_URL, {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { ids: [rule.id] },
      });
      expect(response).toHaveStatusCode(403);
      const stored = await apiServices.alertingV2.rules.get(rule.id);
      expect(stored.version).toBe(rule.version);
    }
  );

  // ---------------------------------------------------------------------------
  // Step 5.3: managed-rule write gate on the bulk-update-api-key path
  // Ref: rule-ownership.md "Path by path"
  // ---------------------------------------------------------------------------

  apiTest(
    'managed-rule gate: should refuse a managed rule with RULE_IS_MANAGED and not rotate its key',
    async ({ apiClient, apiServices }) => {
      const managedRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'managed-rotate' } })
      );
      try {
        await apiServices.alertingV2.ruleSavedObject.setOwnership(managedRule.id, {
          managed: true,
          solution: 'security',
          domain: 'detection',
        });
        // Re-fetch so the baseline version reflects the ES partial update from
        // setOwnership (which bumps _seq_no). The rotation gate must leave it
        // at this version — any write by the rotation path would bump it further.
        const versionAfterStamp = (await apiServices.alertingV2.rules.get(managedRule.id)).version;

        const response = await apiClient.post(BULK_UPDATE_API_KEY_URL, {
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
        // Version unchanged from the post-stamp baseline — no write happened.
        const stored = await apiServices.alertingV2.rules.get(managedRule.id);
        expect(stored.version).toBe(versionAfterStamp);
      } finally {
        // Un-manage so the normal cleanup can delete this rule.
        await apiServices.alertingV2.ruleSavedObject.setOwnership(managedRule.id, {
          managed: false,
        });
      }
    }
  );

  apiTest(
    'managed-rule gate: should rotate unmanaged rules and refuse managed ones in a mixed batch',
    async ({ apiClient, apiServices }) => {
      const managedRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'managed-rotate-batch' } })
      );
      const unmanagedRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'unmanaged-rotate-batch' } })
      );
      try {
        await apiServices.alertingV2.ruleSavedObject.setOwnership(managedRule.id, {
          managed: true,
          solution: 'security',
          domain: 'detection',
        });
        // Re-fetch so the baseline version reflects the ES partial update from
        // setOwnership. Creating the unmanaged rule first advances the shard
        // seq_no by 1, so the setOwnership write assigns a seq_no two higher
        // than what managedRule.version captured at create time.
        const managedVersionAfterStamp = (
          await apiServices.alertingV2.rules.get(managedRule.id)
        ).version;

        const response = await apiClient.post(BULK_UPDATE_API_KEY_URL, {
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
        // The unmanaged rule's version should have bumped (audit stamp); the
        // managed one's should be unchanged from the post-stamp baseline.
        const storedManaged = await apiServices.alertingV2.rules.get(managedRule.id);
        const storedUnmanaged = await apiServices.alertingV2.rules.get(unmanagedRule.id);
        expect(storedManaged.version).toBe(managedVersionAfterStamp);
        // Version strings are base64-encoded opaque tokens — use not.toBe to
        // confirm the rotation write changed the token, not toBeGreaterThan.
        expect(storedUnmanaged.version).not.toBe(unmanagedRule.version);
      } finally {
        // Un-manage so the normal cleanup can delete this rule.
        await apiServices.alertingV2.ruleSavedObject.setOwnership(managedRule.id, {
          managed: false,
        });
      }
    }
  );
});
