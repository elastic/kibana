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

const DELETE_BY_QUERY_URL = `${testData.RULE_API_PATH}/_delete_by_query`;

apiTest.describe('Delete rules by query API', { tag: '@local-stateful-classic' }, () => {
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
    'dry-run: returns match_count and a bounded sample without deleting anything',
    async ({ apiClient, apiServices }) => {
      const ruleA = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-a', tags: ['production'] } })
      );
      const ruleB = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-b', tags: ['production'] } })
      );
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-c', tags: ['development'] } })
      );

      const response = await apiClient.post(DELETE_BY_QUERY_URL, {
        headers: writerHeaders,
        body: { filter: 'metadata.tags: "production"' },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.match_count).toBe(2);
      expect(response.body.sample).toStrictEqual(expect.arrayContaining([ruleA.id, ruleB.id]));

      const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
      expect(remaining.total).toBe(3);
    }
  );

  apiTest(
    'dry-run: returns a zero-match preview when the filter matches nothing',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'unmatched' } })
      );
      const response = await apiClient.post(DELETE_BY_QUERY_URL, {
        headers: writerHeaders,
        body: { filter: 'metadata.name: nonexistent-rule-xyz' },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ match_count: 0, sample: [] });
    }
  );

  apiTest(
    'force=true: deletes rules matching the filter and reports affected_count',
    async ({ apiClient, apiServices }) => {
      const prodRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'prod-rule', tags: ['production'] } })
      );
      const devRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'dev-rule', tags: ['development'] } })
      );

      const response = await apiClient.post(DELETE_BY_QUERY_URL, {
        headers: writerHeaders,
        body: { filter: 'metadata.tags: "production"', force: true },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ affected_count: 1, errors: [] });

      const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
      const remainingIds = remaining.items.map((rule) => rule.id);
      expect(remainingIds).toStrictEqual([devRule.id]);
      expect(remainingIds).not.toContain(prodRule.id);
    }
  );

  apiTest(
    'force=true: deletes all rules with match_all: true',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-a' } })
      );
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-b' } })
      );
      const response = await apiClient.post(DELETE_BY_QUERY_URL, {
        headers: writerHeaders,
        body: { match_all: true, force: true },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.affected_count).toBe(2);
      expect(response.body.errors).toStrictEqual([]);

      const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
      expect(remaining.total).toBe(0);
    }
  );

  apiTest(
    'force=true: returns a zero-affected response when the query matches nothing',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'survivor' } })
      );

      const response = await apiClient.post(DELETE_BY_QUERY_URL, {
        headers: writerHeaders,
        body: { filter: 'metadata.name: nonexistent-rule-xyz', force: true },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ affected_count: 0, errors: [] });

      const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
      expect(remaining.total).toBe(1);
    }
  );

  apiTest('validation: rejects a body with no selector', async ({ apiClient }) => {
    const response = await apiClient.post(DELETE_BY_QUERY_URL, {
      headers: writerHeaders,
      body: {},
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: rejects match_all: false and there are no other selectors',
    async ({ apiClient }) => {
      const response = await apiClient.post(DELETE_BY_QUERY_URL, {
        headers: writerHeaders,
        body: { match_all: false },
      });

      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest('validation: rejects filters longer than MAX_KQL_LENGTH', async ({ apiClient }) => {
    const tooLongFilter = 'a'.repeat(MAX_KQL_LENGTH + 1);
    const response = await apiClient.post(DELETE_BY_QUERY_URL, {
      headers: writerHeaders,
      body: { filter: tooLongFilter },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: rejects search strings longer than MAX_SEARCH_LENGTH',
    async ({ apiClient }) => {
      const tooLongSearch = 'a'.repeat(MAX_SEARCH_LENGTH + 1);
      const response = await apiClient.post(DELETE_BY_QUERY_URL, {
        headers: writerHeaders,
        body: { search: tooLongSearch },
      });

      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest('validation: rejects unknown fields (strict schema)', async ({ apiClient }) => {
    const response = await apiClient.post(DELETE_BY_QUERY_URL, {
      headers: writerHeaders,
      body: { unknown: 'value' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authz: returns 200 for a user with full alerting_v2 privileges',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'writer-can-delete' } })
      );
      const response = await apiClient.post(DELETE_BY_QUERY_URL, {
        headers: writerHeaders,
        body: { match_all: true, force: true },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.errors).toStrictEqual([]);
    }
  );

  apiTest(
    'authz: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'reader-cannot-delete' } })
      );
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_READ_ROLE
      );
      const response = await apiClient.post(DELETE_BY_QUERY_URL, {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { match_all: true, force: true },
      });
      expect(response).toHaveStatusCode(403);
      const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
      expect(remaining.items.map((r) => r.id)).toContain(rule.id);
    }
  );

  apiTest(
    'authz: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'noaccess-cannot-delete' } })
      );
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.post(DELETE_BY_QUERY_URL, {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { match_all: true, force: true },
      });
      expect(response).toHaveStatusCode(403);
      const remaining = await apiServices.alertingV2.rules.find({ perPage: 100 });
      expect(remaining.items.map((r) => r.id)).toContain(rule.id);
    }
  );
});
