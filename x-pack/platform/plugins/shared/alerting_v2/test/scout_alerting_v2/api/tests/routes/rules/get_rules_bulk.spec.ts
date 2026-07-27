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
  getBulkRulesUrl,
} from '../../../fixtures';

apiTest.describe('Bulk get rules API', { tag: '@local-stateful-classic' }, () => {
  let readerCredentials: RoleApiCredentials;
  let readerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    readerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_RULES_READ_ROLE);
    readerHeaders = { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest(
    'bulk-get: should return the requested rules when given multiple ids',
    async ({ apiClient, apiServices }) => {
      const ruleA = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-a' } })
      );
      const ruleB = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-b' } })
      );
      // Seed a third rule that is NOT requested to confirm the endpoint does
      // not leak unrelated rules into the response.
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-c' } })
      );

      const response = await apiClient.post(getBulkRulesUrl(), {
        headers: readerHeaders,
        body: { ids: [ruleA.id, ruleB.id] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.rules.map((rule: { id: string }) => rule.id)).toStrictEqual([
        ruleA.id,
        ruleB.id,
      ]);
    }
  );

  apiTest(
    'bulk-get: should return rules in the exact order of the requested ids',
    async ({ apiClient, apiServices }) => {
      // Create rules in alphabetical order, then request them in reverse so we
      // can prove the response order tracks the request, not creation order.
      const ruleA = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-a' } })
      );
      const ruleB = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-b' } })
      );
      const ruleC = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-c' } })
      );

      const requestedOrder = [ruleC.id, ruleA.id, ruleB.id];

      const response = await apiClient.post(getBulkRulesUrl(), {
        headers: readerHeaders,
        body: { ids: requestedOrder },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.rules.map((rule: { id: string }) => rule.id)).toStrictEqual(
        requestedOrder
      );
    }
  );

  apiTest(
    'bulk-get: should return a single rule when given a single id',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'single-rule' } })
      );

      const response = await apiClient.post(getBulkRulesUrl(), {
        headers: readerHeaders,
        body: { ids: [rule.id] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.rules).toHaveLength(1);
      expect(response.body.rules[0].id).toBe(rule.id);
    }
  );

  apiTest(
    'bulk-get: should return 404 when one or more requested ids are missing',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'present-rule' } })
      );

      const response = await apiClient.post(getBulkRulesUrl(), {
        headers: readerHeaders,
        body: { ids: [rule.id, 'does-not-exist'] },
      });

      expect(response).toHaveStatusCode(404);
      expect(response.body.code).toBe('NOT_FOUND');
    }
  );

  apiTest(
    'bulk-get: should return 404 when all requested ids are missing',
    async ({ apiClient }) => {
      const response = await apiClient.post(getBulkRulesUrl(), {
        headers: readerHeaders,
        body: { ids: ['missing-1', 'missing-2'] },
      });

      expect(response).toHaveStatusCode(404);
      expect(response.body.code).toBe('NOT_FOUND');
    }
  );

  apiTest('validation: should reject an empty ids array', async ({ apiClient }) => {
    const response = await apiClient.post(getBulkRulesUrl(), {
      headers: readerHeaders,
      body: { ids: [] },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject more than MAX_BULK_ITEMS ids', async ({ apiClient }) => {
    const ids = Array.from({ length: MAX_BULK_ITEMS + 1 }, (_, i) => `id-${i}`);
    const response = await apiClient.post(getBulkRulesUrl(), {
      headers: readerHeaders,
      body: { ids },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject ids longer than ID_MAX_LENGTH', async ({ apiClient }) => {
    const tooLongId = 'a'.repeat(ID_MAX_LENGTH + 1);
    const response = await apiClient.post(getBulkRulesUrl(), {
      headers: readerHeaders,
      body: { ids: [tooLongId] },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject an empty body', async ({ apiClient }) => {
    const response = await apiClient.post(getBulkRulesUrl(), {
      headers: readerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: should reject unknown top-level body fields (strict)',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'strict-rule' } })
      );
      const response = await apiClient.post(getBulkRulesUrl(), {
        headers: readerHeaders,
        body: { ids: [rule.id], foo: 'bar' },
      });
      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest(
    'authorization: should return 200 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'visible-to-readers' } })
      );
      const response = await apiClient.post(getBulkRulesUrl(), {
        headers: readerHeaders,
        body: { ids: [rule.id] },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.rules[0].id).toBe(rule.id);
    }
  );

  apiTest(
    'authorization: should return 200 for a user with full alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'visible-to-writers' } })
      );
      const writerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_ALL_ROLE
      );
      const response = await apiClient.post(getBulkRulesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader },
        body: { ids: [rule.id] },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.rules[0].id).toBe(rule.id);
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'hidden-rule' } })
      );
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.post(getBulkRulesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { ids: [rule.id] },
      });
      expect(response).toHaveStatusCode(403);
    }
  );
});
