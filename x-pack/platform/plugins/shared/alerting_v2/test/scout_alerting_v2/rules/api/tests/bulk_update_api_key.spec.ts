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
      // encrypted). `affected_count` above is the real signal: a rule is only
      // counted once both the task rotation and the saved-object write succeeded.
      // The audit stamp is a weaker sanity check — `updated_at` has millisecond
      // resolution, so create and rotation can share a millisecond and the
      // comparison has to be non-strict.
      for (const created of [ruleA, ruleB]) {
        const fetched = await apiServices.alertingV2.rules.get(created.id);
        expect(Date.parse(fetched.updated_at)).toBeGreaterThanOrEqual(
          Date.parse(created.updated_at)
        );
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
      });
      // Non-strict for the same reason as above: millisecond-resolution stamps.
      expect(Date.parse(fetched.updated_at)).toBeGreaterThanOrEqual(Date.parse(created.updated_at));
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
      expect(stored).toStrictEqual(rule);
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
      expect(stored).toStrictEqual(rule);
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
        // Re-fetch to capture the audit stamp the gate has to leave alone.
        // `version` cannot serve as the write detector here: it counts rule
        // configuration changes, and a key rotation is not one, so it stays put
        // whether the gate refuses the write or lets it through. `updated_at`
        // and `updated_by` are what the rotation path stamps on every rule it
        // writes, so an unchanged stamp is the signal that no write happened.
        const beforeRotation = await apiServices.alertingV2.rules.get(managedRule.id);

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
        // Audit stamp unchanged from the pre-rotation baseline — no write happened.
        const stored = await apiServices.alertingV2.rules.get(managedRule.id);
        expect(stored.updated_at).toBe(beforeRotation.updated_at);
        // `updated_by` is a nullable actor object, so it needs deep equality:
        // the two fetches return structurally equal objects, not the same one.
        expect(stored.updated_by).toStrictEqual(beforeRotation.updated_by);
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
      // This is the only test in the file that expects a rotation to succeed
      // while another rule in the same batch is refused, so it needs the
      // unmanaged rule's executor task to be idle at the moment it rotates:
      // `bulkUpdateSchedules` only touches `idle` tasks, and a mid-run one
      // comes back as RULE_ALREADY_RUNNING, which costs the batch its only
      // affected rule. The fixture default schedules every rule at 5s, so the
      // task churns for the whole test and the rotation races it.
      //
      // A long interval alone does not fix that, because task manager sets the
      // first run at creation time whatever the interval is — the interval only
      // decides when the *next* run is due. So both halves are needed: an hour
      // puts the next run well outside the test, and the waits below let the
      // first one finish. From there both tasks stay idle.
      const since = new Date();
      const schedule = { every: '1h', lookback: testData.LOOKBACK_WINDOW };

      const managedRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'managed-rotate-batch' }, schedule })
      );
      const unmanagedRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'unmanaged-rotate-batch' }, schedule })
      );
      try {
        // Drain both, not just the rotation target: it makes the precondition
        // simply "no run is in flight", which does not quietly depend on the
        // executor never touching the rule saved object.
        for (const ruleId of [managedRule.id, unmanagedRule.id]) {
          await apiServices.alertingV2.ruleExecutions.waitForRuns({ ruleId, runs: 1, since });
          await apiServices.alertingV2.ruleExecutions.waitForTaskDrained({ ruleId });
        }

        await apiServices.alertingV2.ruleSavedObject.setOwnership(managedRule.id, {
          managed: true,
          solution: 'security',
          domain: 'detection',
        });
        // Re-fetch to capture the audit stamp the gate has to leave alone, for
        // the same reason as the single-rule gate test above.
        const managedBeforeRotation = await apiServices.alertingV2.rules.get(managedRule.id);

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
        const storedManaged = await apiServices.alertingV2.rules.get(managedRule.id);
        const storedUnmanaged = await apiServices.alertingV2.rules.get(unmanagedRule.id);
        // The managed rule was refused before any write, so its audit stamp is
        // untouched. That the unmanaged one did rotate is established by
        // `affected_count: 1` above; its stamp is only a weaker sanity check,
        // and `updated_at` has millisecond resolution, so create and rotation
        // can share a millisecond and the comparison has to be non-strict.
        expect(storedManaged.updated_at).toBe(managedBeforeRotation.updated_at);
        // Deep equality for the actor object, as in the single-rule gate test.
        expect(storedManaged.updated_by).toStrictEqual(managedBeforeRotation.updated_by);
        expect(Date.parse(storedUnmanaged.updated_at)).toBeGreaterThanOrEqual(
          Date.parse(unmanagedRule.updated_at)
        );
      } finally {
        // Un-manage so the normal cleanup can delete this rule.
        await apiServices.alertingV2.ruleSavedObject.setOwnership(managedRule.id, {
          managed: false,
        });
      }
    }
  );
});
