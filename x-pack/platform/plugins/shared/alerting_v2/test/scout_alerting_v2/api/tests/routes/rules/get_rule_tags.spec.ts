/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  ALERTING_V2_RULES_ALL_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildCreateRuleData,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

const TAGS_URL = `${testData.RULE_API_PATH}/_tags`;

const tagsUrl = (params: Record<string, string | undefined> = {}): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${TAGS_URL}?${qs}` : TAGS_URL;
};

apiTest.describe('Get rule tags API', { tag: '@local-stateful-classic' }, () => {
  let readerCredentials: RoleApiCredentials;
  let readerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    readerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_RULES_READ_ROLE);
    readerHeaders = { ...readerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest('tags: should return an empty array when no rules exist', async ({ apiClient }) => {
    const response = await apiClient.get(TAGS_URL, {
      headers: readerHeaders,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ tags: [] });
  });

  apiTest(
    'tags: should return the unique union of tags across rules, sorted ascending',
    async ({ apiClient, apiServices }) => {
      // Seed three rules whose tag sets overlap so the response should:
      //   * deduplicate ("cpu" appears in two rules),
      //   * include every tag from at least one rule, and
      //   * be sorted ascending by `_key` (server-side aggregation order).
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-a', tags: ['production', 'cpu'] } })
      );
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-b', tags: ['cpu', 'memory'] } })
      );
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-c', tags: ['development'] } })
      );

      const response = await apiClient.get(TAGS_URL, {
        headers: readerHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        tags: ['cpu', 'development', 'memory', 'production'],
      });
    }
  );

  apiTest(
    'tags: should not include falsy entries for rules with no tags',
    async ({ apiClient, apiServices }) => {
      // Mix a rule with tags and a rule without `metadata.tags` set at all.
      // The aggregation should ignore the latter rather than emit
      // `undefined`, `null`, or empty strings.
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'tagged-rule', tags: ['cpu'] } })
      );
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'untagged-rule' } })
      );

      const response = await apiClient.get(TAGS_URL, {
        headers: readerHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toContain('cpu');
      expect(response.body.tags).not.toContain(undefined);
      expect(response.body.tags).not.toContain(null);
      expect(response.body.tags).not.toContain('');
    }
  );

  apiTest(
    'filter: should only return tags from rules matching the filter',
    async ({ apiClient, apiServices }) => {
      // Seed an alert-kind rule and a signal-kind rule with disjoint tags so a
      // `kind:alert` filter must exclude the signal rule's tags entirely.
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          kind: 'alert',
          metadata: { name: 'alert-rule', tags: ['alert-tag'] },
        })
      );
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          kind: 'signal',
          state_transition: undefined,
          metadata: { name: 'signal-rule', tags: ['signal-tag'] },
        })
      );

      const filtered = await apiClient.get(tagsUrl({ filter: 'kind:alert' }), {
        headers: readerHeaders,
      });

      expect(filtered).toHaveStatusCode(200);
      expect(filtered.body).toStrictEqual({ tags: ['alert-tag'] });

      // Without a filter both rules' tags are returned.
      const unfiltered = await apiClient.get(TAGS_URL, {
        headers: readerHeaders,
      });

      expect(unfiltered).toHaveStatusCode(200);
      expect(unfiltered.body).toStrictEqual({ tags: ['alert-tag', 'signal-tag'] });
    }
  );

  apiTest(
    'filter: should return 400 for an invalid filter field',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'alert-rule', tags: ['alert-tag'] } })
      );

      const response = await apiClient.get(tagsUrl({ filter: 'not_a_field:alert' }), {
        headers: readerHeaders,
      });

      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest(
    'authorization: should return 200 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'visible-to-readers', tags: ['cpu'] } })
      );

      const response = await apiClient.get(TAGS_URL, {
        headers: readerHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toContain('cpu');
    }
  );

  apiTest(
    'authorization: should return 200 for a user with full alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'visible-to-writers', tags: ['memory'] } })
      );
      const writerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_ALL_ROLE
      );

      const response = await apiClient.get(TAGS_URL, {
        headers: writerCredentials.apiKeyHeader,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toContain('memory');
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'hidden-rule', tags: ['cpu'] } })
      );
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);

      const response = await apiClient.get(TAGS_URL, {
        headers: noAccessCredentials.apiKeyHeader,
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
