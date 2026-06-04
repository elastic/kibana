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

const BULK_DISABLE_URL = `${testData.RULE_API_PATH}/_bulk_disable`;

apiTest.describe('Bulk disable rules API', { tag: '@local-stateful-classic' }, () => {
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
    expect(response.body.errors).toStrictEqual([]);
    expect(response.body.rules).toHaveLength(2);
    expectNoBulkTruncationMetadata(response.body);
    const returnedIds = response.body.rules.map((rule: { id: string }) => rule.id);
    expect(returnedIds.sort()).toStrictEqual([ruleA.id, ruleB.id].sort());
    // Verify the side effect: both rules are now disabled.
    const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
    expect(remaining.items.every((rule) => rule.enabled === false)).toBe(true);
  });

  apiTest(
    'disable: should disable all rules with match_all: true',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-a' } })
      );
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-b' } })
      );
      const response = await apiClient.post(BULK_DISABLE_URL, {
        headers: writerHeaders,
        body: { match_all: true },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.errors).toStrictEqual([]);
      expect(response.body.rules).toHaveLength(2);
      const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
      expect(remaining.items.every((rule) => rule.enabled === false)).toBe(true);
    }
  );

  apiTest(
    'disable: should disable only rules matching the filter',
    async ({ apiClient, apiServices }) => {
      const prodRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'prod-rule', tags: ['production'] } })
      );
      const devRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'dev-rule', tags: ['development'] } })
      );
      const response = await apiClient.post(BULK_DISABLE_URL, {
        headers: writerHeaders,
        body: { filter: 'metadata.tags: "production"' },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.errors).toStrictEqual([]);
      expect(response.body.rules).toHaveLength(1);
      expect(response.body.rules[0].id).toBe(prodRule.id);
      // The dev rule should still be enabled.
      const stored = await apiServices.alertingV2.rules.get(devRule.id);
      expect(stored.enabled).toBe(true);
    }
  );

  apiTest(
    'disable: should be idempotent when called on already-disabled rules',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'already-disabled' } })
      );
      // Use the service to flip state via the (other) bulk_disable endpoint.
      await apiServices.alertingV2.rules.bulkDisable({ ids: [rule.id] });
      const response = await apiClient.post(BULK_DISABLE_URL, {
        headers: writerHeaders,
        body: { ids: [rule.id] },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.errors).toStrictEqual([]);
      expect(response.body.rules).toHaveLength(1);
      expect(response.body.rules[0].id).toBe(rule.id);
      expect(response.body.rules[0].enabled).toBe(false);
    }
  );

  apiTest(
    'disable: should report unknown ids in the errors array',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'existing-rule' } })
      );
      const response = await apiClient.post(BULK_DISABLE_URL, {
        headers: writerHeaders,
        body: { ids: [rule.id, 'does-not-exist'] },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.rules).toHaveLength(1);
      expect(response.body.rules[0].id).toBe(rule.id);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0]).toMatchObject({
        id: 'does-not-exist',
        error: { statusCode: 404 },
      });
    }
  );

  apiTest(
    'disable: should disable only rules matching a `kind` filter',
    async ({ apiClient, apiServices }) => {
      const alertRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ kind: 'alert', metadata: { name: 'alert-rule' } })
      );
      const signalRule = await apiServices.alertingV2.rules.create(
        // Signal rules must opt out of the default `state_transition`,
        // which the schema only allows for `kind: 'alert'`.
        buildCreateRuleData({
          kind: 'signal',
          state_transition: undefined,
          metadata: { name: 'signal-rule' },
        })
      );

      const response = await apiClient.post(BULK_DISABLE_URL, {
        headers: writerHeaders,
        body: { filter: 'kind: alert' },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.errors).toStrictEqual([]);
      expect(response.body.rules).toHaveLength(1);
      expect(response.body.rules[0].id).toBe(alertRule.id);
      expectNoBulkTruncationMetadata(response.body);

      // The signal rule must still be enabled.
      const stored = await apiServices.alertingV2.rules.get(signalRule.id);
      expect(stored.enabled).toBe(true);
    }
  );

  apiTest(
    'disable: should return 200 with empty results when filter matches nothing',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'enabled-rule' } })
      );

      const response = await apiClient.post(BULK_DISABLE_URL, {
        headers: writerHeaders,
        body: { filter: 'kind: nonexistent' },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.rules).toStrictEqual([]);
      expect(response.body.errors).toStrictEqual([]);
      expectNoBulkTruncationMetadata(response.body);
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
      expect(disableResponse.body.rules).toHaveLength(2);

      // Re-enable only A. The sibling bulk_enable endpoint has its own spec; here it's
      // just setup, so we go through the service helper.
      const enableResponse = await apiServices.alertingV2.rules.bulkEnable({ ids: [ruleA.id] });
      expect(enableResponse.rules).toHaveLength(1);

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

  apiTest('validation: should reject body without any selector', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_DISABLE_URL, {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject combining ids with filter', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_DISABLE_URL, {
      headers: writerHeaders,
      body: { ids: ['some-id'], filter: 'metadata.tags: "x"' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject combining match_all with ids', async ({ apiClient }) => {
    const response = await apiClient.post(BULK_DISABLE_URL, {
      headers: writerHeaders,
      body: { match_all: true, ids: ['some-id'] },
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
      expect(response.body.rules[0].id).toBe(rule.id);
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
