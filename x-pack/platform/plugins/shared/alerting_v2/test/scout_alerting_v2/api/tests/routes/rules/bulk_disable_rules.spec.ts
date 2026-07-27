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

const BULK_DISABLE_URL = `${testData.RULE_API_PATH}/_bulk_disable`;

apiTest.describe('Bulk disable rules by IDs API', { tag: '@local-stateful-classic' }, () => {
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

  apiTest('disable: should disable rules by ids', async ({ apiClient, apiServices }) => {
    // Rules are created enabled by default — perfect starting state.
    const ruleA = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'rule-a' } })
    );
    const ruleB = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'rule-b' } })
    );
    const response = await apiClient.post(BULK_DISABLE_URL, {
      headers: writerHeaders,
      body: { ids: [ruleA.id, ruleB.id] },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ affected_count: 2, errors: [] });
    // Verify the side effect: both rules are now disabled.
    const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
    expect(remaining.items.every((rule) => rule.enabled === false)).toBe(true);
  });

  apiTest(
    'disable: should be idempotent when called on already-disabled rules',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'already-disabled' } })
      );
      // Flip state via the same endpoint we're testing.
      await apiServices.alertingV2.rules.bulkDisable({ ids: [rule.id] });
      const response = await apiClient.post(BULK_DISABLE_URL, {
        headers: writerHeaders,
        body: { ids: [rule.id] },
      });
      expect(response).toHaveStatusCode(200);
      // Already-disabled rules still count as affected: the operation is
      // idempotent and clients should not have to special-case them.
      expect(response.body).toStrictEqual({ affected_count: 1, errors: [] });
      const stored = await apiServices.alertingV2.rules.get(rule.id);
      expect(stored.enabled).toBe(false);
    }
  );

  apiTest(
    'disable: should report unknown ids in the errors array with RULE_NOT_FOUND code',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'existing-rule' } })
      );
      const response = await apiClient.post(BULK_DISABLE_URL, {
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

  apiTest(
    'disable/enable: should toggle rules between enabled and disabled states across endpoints',
    async ({ apiClient, apiServices }) => {
      const ruleA = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'toggle-a' } })
      );
      const ruleB = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'toggle-b' } })
      );
      const ruleC = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'toggle-c' } })
      );

      // Disable A and B.
      const disableResponse = await apiClient.post(BULK_DISABLE_URL, {
        headers: writerHeaders,
        body: { ids: [ruleA.id, ruleB.id] },
      });
      expect(disableResponse).toHaveStatusCode(200);
      expect(disableResponse.body.affected_count).toBe(2);

      // Re-enable only A. The sibling bulk_enable endpoint has its own spec; here it's
      // just setup, so we go through the service helper.
      const enableResponse = await apiServices.alertingV2.rules.bulkEnable({ ids: [ruleA.id] });
      expect(enableResponse.affected_count).toBe(1);

      // Final expected state: A enabled, B disabled, C enabled.
      const finalA = await apiServices.alertingV2.rules.get(ruleA.id);
      const finalB = await apiServices.alertingV2.rules.get(ruleB.id);
      const finalC = await apiServices.alertingV2.rules.get(ruleC.id);
      expect(finalA.enabled).toBe(true);
      expect(finalB.enabled).toBe(false);
      expect(finalC.enabled).toBe(true);
    }
  );

  apiTest('validation: should reject an empty ids array', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_DISABLE_URL, {
      headers: writerHeaders,
      body: { ids: [] },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject a body with no ids field', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_DISABLE_URL, {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject unknown fields (strict schema)', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_DISABLE_URL, {
      headers: writerHeaders,
      body: { ids: ['some-id'], unknown: 'value' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject ids longer than ID_MAX_LENGTH', async ({ apiClient }) => {
    const tooLongId = 'a'.repeat(ID_MAX_LENGTH + 1);
    const response = await apiClient.post(BULK_DISABLE_URL, {
      headers: writerHeaders,
      body: { ids: [tooLongId] },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: should reject ids arrays longer than MAX_BULK_ITEMS',
    async ({ apiClient }) => {
      const ids = Array.from({ length: MAX_BULK_ITEMS + 1 }, (_, i) => `id-${i}`);
      const response = await apiClient.post(BULK_DISABLE_URL, {
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
        buildCreateRuleData({ metadata: { name: 'writer-can-disable' } })
      );
      const response = await apiClient.post(BULK_DISABLE_URL, {
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
        buildCreateRuleData({ metadata: { name: 'reader-cannot-disable' } })
      );
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_READ_ROLE
      );
      const response = await apiClient.post(BULK_DISABLE_URL, {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { ids: [rule.id] },
      });
      expect(response).toHaveStatusCode(403);
      // Verify the rule remained enabled after the failed call.
      const stored = await apiServices.alertingV2.rules.get(rule.id);
      expect(stored.enabled).toBe(true);
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'noaccess-cannot-disable' } })
      );
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.post(BULK_DISABLE_URL, {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { ids: [rule.id] },
      });
      expect(response).toHaveStatusCode(403);
      const stored = await apiServices.alertingV2.rules.get(rule.id);
      expect(stored.enabled).toBe(true);
    }
  );
});
