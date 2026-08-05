/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { MAX_KQL_LENGTH, MAX_SEARCH_LENGTH } from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_RULES_ALL_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildCreateRuleData,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

const ENABLE_BY_QUERY_URL = `${testData.RULE_API_PATH}/_enable_by_query`;

apiTest.describe('Enable rules by query API', { tag: '@local-stateful-classic' }, () => {
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

  apiTest(
    'dry-run: returns match_count and sample without enabling anything',
    async ({ apiClient, apiServices }) => {
      const ruleA = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-a', tags: ['production'] } })
      );
      const ruleB = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-b', tags: ['production'] } })
      );
      await apiServices.alertingV2.rules.bulkDisable({ ids: [ruleA.id, ruleB.id] });

      const response = await apiClient.post(ENABLE_BY_QUERY_URL, {
        headers: writerHeaders,
        body: { filter: 'metadata.tags: "production"' },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.match_count).toBe(2);
      expect(response.body.sample).toStrictEqual(expect.arrayContaining([ruleA.id, ruleB.id]));

      const stored = await apiServices.alertingV2.rules.get(ruleA.id);
      expect(stored.enabled).toBe(false);
    }
  );

  apiTest(
    'force=true: enables rules matching the filter and reports affected_count',
    async ({ apiClient, apiServices }) => {
      const prodRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'prod-rule', tags: ['production'] } })
      );
      const devRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'dev-rule', tags: ['development'] } })
      );
      await apiServices.alertingV2.rules.bulkDisable({ ids: [prodRule.id, devRule.id] });

      const response = await apiClient.post(ENABLE_BY_QUERY_URL, {
        headers: writerHeaders,
        body: { filter: 'metadata.tags: "production"', force: true },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ affected_count: 1, errors: [] });

      const storedProd = await apiServices.alertingV2.rules.get(prodRule.id);
      const storedDev = await apiServices.alertingV2.rules.get(devRule.id);
      expect(storedProd.enabled).toBe(true);
      expect(storedDev.enabled).toBe(false);
    }
  );

  apiTest(
    'force=true: enables all rules with match_all: true',
    async ({ apiClient, apiServices }) => {
      const ruleA = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-a' } })
      );
      const ruleB = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-b' } })
      );
      await apiServices.alertingV2.rules.bulkDisable({ ids: [ruleA.id, ruleB.id] });

      const response = await apiClient.post(ENABLE_BY_QUERY_URL, {
        headers: writerHeaders,
        body: { match_all: true, force: true },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(2);
      expect(response.body.errors).toStrictEqual([]);

      const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
      expect(remaining.items.every((rule) => rule.enabled)).toBe(true);
    }
  );

  apiTest('validation: rejects a body with no selector', async ({ apiClient }) => {
    const response = await apiClient.post(ENABLE_BY_QUERY_URL, {
      headers: writerHeaders,
      body: {},
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: rejects match_all: false and there are no other selectors',
    async ({ apiClient }) => {
      const response = await apiClient.post(ENABLE_BY_QUERY_URL, {
        headers: writerHeaders,
        body: { match_all: false },
      });
      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest('validation: rejects filters longer than MAX_KQL_LENGTH', async ({ apiClient }) => {
    const response = await apiClient.post(ENABLE_BY_QUERY_URL, {
      headers: writerHeaders,
      body: { filter: 'a'.repeat(MAX_KQL_LENGTH + 1) },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: rejects search strings longer than MAX_SEARCH_LENGTH',
    async ({ apiClient }) => {
      const response = await apiClient.post(ENABLE_BY_QUERY_URL, {
        headers: writerHeaders,
        body: { search: 'a'.repeat(MAX_SEARCH_LENGTH + 1) },
      });
      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest('validation: rejects unknown fields (strict schema)', async ({ apiClient }) => {
    const response = await apiClient.post(ENABLE_BY_QUERY_URL, {
      headers: writerHeaders,
      body: { ids: ['some-id'] },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authz: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'reader-cannot-enable' } })
      );
      await apiServices.alertingV2.rules.bulkDisable({ ids: [rule.id] });
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_READ_ROLE
      );
      const response = await apiClient.post(ENABLE_BY_QUERY_URL, {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { match_all: true, force: true },
      });
      expect(response).toHaveStatusCode(403);
      const stored = await apiServices.alertingV2.rules.get(rule.id);
      expect(stored.enabled).toBe(false);
    }
  );

  apiTest(
    'authz: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'noaccess-cannot-enable' } })
      );
      await apiServices.alertingV2.rules.bulkDisable({ ids: [rule.id] });
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.post(ENABLE_BY_QUERY_URL, {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { match_all: true, force: true },
      });
      expect(response).toHaveStatusCode(403);
      const stored = await apiServices.alertingV2.rules.get(rule.id);
      expect(stored.enabled).toBe(false);
    }
  );
});
