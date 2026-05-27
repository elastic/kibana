/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  ALL_ROLE,
  apiTest,
  buildCreateRuleData,
  NO_ACCESS_ROLE,
  READ_ROLE,
  testData,
} from '../../../fixtures';

const TAGS_URL = `${testData.RULE_API_PATH}/_tags`;

apiTest.describe('Get rule tags API', { tag: '@local-stateful-classic' }, () => {
  let readerCredentials: RoleApiCredentials;
  let readerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    readerCredentials = await requestAuth.getApiKeyForCustomRole(READ_ROLE);
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
      const writerCredentials = await requestAuth.getApiKeyForCustomRole(ALL_ROLE);

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
