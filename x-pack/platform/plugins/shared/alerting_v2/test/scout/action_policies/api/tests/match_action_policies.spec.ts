/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  testData,
  type AlertingApiServicesFixture,
} from '../fixtures';

const MATCH_ACTION_POLICIES_URL = testData.INTERNAL_ACTION_POLICY_MATCH_API_PATH;

apiTest.describe('Match action policies API', { tag: testData.API_ENGINE_TAG }, () => {
  let readerCredentials: RoleApiCredentials;
  let readerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    readerCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_ACTION_POLICIES_READ_ROLE
    );
    readerHeaders = { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  const createMatchFixtures = async (apiServices: AlertingApiServicesFixture) => {
    const tagged = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'Prod tagged policy', matcher: { tags: ['prod'] } })
    );
    const catchAll = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'Catch-all policy' })
    );
    const nonMatching = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'Staging tagged policy', matcher: { tags: ['staging'] } })
    );
    return { tagged, catchAll, nonMatching };
  };

  apiTest(
    'match: returns tag-matched and catch-all policies with their category for the rule routing tags',
    async ({ apiClient, apiServices }) => {
      const { tagged, catchAll, nonMatching } = await createMatchFixtures(apiServices);

      const response = await apiClient.post(MATCH_ACTION_POLICIES_URL, {
        headers: readerHeaders,
        body: { rule: { routing_tags: ['prod'] } },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.evaluated_count).toBe(3);
      expect(response.body.is_truncated).toBe(false);

      const categoriesById = new Map<string, string>(
        response.body.items.map(
          (item: { action_policy: { id: string }; category: string }): [string, string] => [
            item.action_policy.id,
            item.category,
          ]
        )
      );

      expect(categoriesById.get(tagged.id)).toBe('tags');
      expect(categoriesById.get(catchAll.id)).toBe('catch_all');
      expect(categoriesById.has(nonMatching.id)).toBe(false);
    }
  );

  apiTest(
    'match: returns only catch-all policies when the rule has no routing tags',
    async ({ apiClient, apiServices }) => {
      const { tagged, catchAll, nonMatching } = await createMatchFixtures(apiServices);

      const response = await apiClient.post(MATCH_ACTION_POLICIES_URL, {
        headers: readerHeaders,
        body: { rule: {} },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.evaluated_count).toBe(3);

      const matchedIds = response.body.items.map(
        (item: { action_policy: { id: string } }): string => item.action_policy.id
      );

      expect(matchedIds).toStrictEqual([catchAll.id]);
      expect(matchedIds).not.toContain(tagged.id);
      expect(matchedIds).not.toContain(nonMatching.id);
    }
  );

  apiTest(
    'validation: rejects rule.tags (policies match on routing tags)',
    async ({ apiClient }) => {
      const response = await apiClient.post(MATCH_ACTION_POLICIES_URL, {
        headers: readerHeaders,
        body: { rule: { tags: ['prod'] } },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest(
    'validation: rejects body with unknown top-level keys (strict schema)',
    async ({ apiClient }) => {
      const response = await apiClient.post(MATCH_ACTION_POLICIES_URL, {
        headers: readerHeaders,
        body: {
          rule: { routing_tags: ['prod'] },
          unknownField: 'x',
        },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );
});
