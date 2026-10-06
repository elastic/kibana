/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import {
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildCreateRuleData,
  MAX_PER_PAGE,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

const MATCH_RULES_URL = testData.INTERNAL_RULE_MATCH_API_PATH;

const ALERT_RULES: ReadonlyArray<{ name: string; tags?: string[] }> = [
  { name: 'rule-cpu', tags: ['cpu'] },
  { name: 'rule-cpu-production', tags: ['cpu', 'production'] },
  { name: 'rule-memory', tags: ['memory'] },
  { name: 'rule-untagged' },
];

const SIGNAL_RULE = {
  name: 'signal-rule',
  tags: ['cpu', 'production', 'memory', 'signal-only'],
};

const getRuleNames = (items: Array<{ metadata: { name: string } }>) =>
  items.map((rule) => rule.metadata.name);

/*
 * Custom-role auth is not yet supported on Elastic Cloud Hosted, so the suite is
 * restricted to local stateful (classic), like the other rules API suites.
 */
apiTest.describe('Match rules API', { tag: '@local-stateful-classic' }, () => {
  let readerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
    const readerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_RULES_READ_ROLE);
    readerHeaders = { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader };

    await apiServices.alertingV2.rules.cleanUp();
    await Promise.all([
      ...ALERT_RULES.map((metadata) =>
        apiServices.alertingV2.rules.create(buildCreateRuleData({ metadata }))
      ),
      apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          kind: 'signal',
          state_transition: undefined,
          recovery: undefined,
          no_data: undefined,
          metadata: SIGNAL_RULE,
        })
      ),
    ]);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest(
    'tags: should return the alert rules with any of the matcher tags, sorted by name',
    async ({ apiClient }) => {
      const response = await apiClient.post(MATCH_RULES_URL, {
        headers: readerHeaders,
        body: { matcher: { tags: ['production', 'memory'] } },
      });

      expect(response).toHaveStatusCode(200);
      expect(getRuleNames(response.body.items)).toStrictEqual([
        'rule-cpu-production',
        'rule-memory',
      ]);
      expect(response.body.total).toBe(2);
    }
  );

  apiTest('tags: should ignore the matcher expression', async ({ apiClient }) => {
    const response = await apiClient.post(MATCH_RULES_URL, {
      headers: readerHeaders,
      body: { matcher: { tags: ['cpu'], expression: 'data.host.name: "host-1"' } },
    });

    expect(response).toHaveStatusCode(200);
    expect(getRuleNames(response.body.items)).toStrictEqual(['rule-cpu', 'rule-cpu-production']);
  });

  apiTest(
    'tags: should return an empty list when no rule has the matcher tags',
    async ({ apiClient }) => {
      const response = await apiClient.post(MATCH_RULES_URL, {
        headers: readerHeaders,
        body: { matcher: { tags: ['unknown-tag'] } },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.items).toStrictEqual([]);
      expect(response.body.total).toBe(0);
    }
  );

  apiTest(
    'kind: should not return signal rules, even when they have the matcher tags',
    async ({ apiClient }) => {
      const response = await apiClient.post(MATCH_RULES_URL, {
        headers: readerHeaders,
        body: { matcher: { tags: ['signal-only'] } },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.items).toStrictEqual([]);
      expect(response.body.total).toBe(0);
    }
  );

  apiTest(
    'catch-all: should return every alert rule when the matcher has no tags',
    async ({ apiClient }) => {
      for (const body of [
        {},
        { matcher: null },
        { matcher: { tags: null, expression: null } },
        { matcher: { expression: 'data.host.name: "host-1"' } },
      ]) {
        const response = await apiClient.post(MATCH_RULES_URL, { headers: readerHeaders, body });

        expect(response).toHaveStatusCode(200);
        expect(getRuleNames(response.body.items)).toStrictEqual(
          ALERT_RULES.map(({ name }) => name)
        );
        expect(response.body.total).toBe(ALERT_RULES.length);
      }
    }
  );

  apiTest('pagination: should paginate the matching rules', async ({ apiClient }) => {
    const response = await apiClient.post(MATCH_RULES_URL, {
      headers: readerHeaders,
      body: { matcher: { tags: ['cpu'] }, page: 2, per_page: 1 },
    });

    expect(response).toHaveStatusCode(200);
    expect(getRuleNames(response.body.items)).toStrictEqual(['rule-cpu-production']);
    expect(response.body.total).toBe(2);
    expect(response.body.page).toBe(2);
    expect(response.body.per_page).toBe(1);
  });

  apiTest('validation: should return 400 for unknown top-level keys', async ({ apiClient }) => {
    const response = await apiClient.post(MATCH_RULES_URL, {
      headers: readerHeaders,
      body: { policy_id: 'policy-1' },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'validation: should return 400 when per_page exceeds the maximum',
    async ({ apiClient }) => {
      const response = await apiClient.post(MATCH_RULES_URL, {
        headers: readerHeaders,
        body: { per_page: MAX_PER_PAGE + 1 },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);

      const response = await apiClient.post(MATCH_RULES_URL, {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { matcher: { tags: ['cpu'] } },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
