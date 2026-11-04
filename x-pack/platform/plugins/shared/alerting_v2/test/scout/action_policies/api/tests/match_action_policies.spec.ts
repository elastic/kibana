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

// The match response reports `evaluated_count` / `is_truncated` over every
// policy in the request's space, so these scenarios run in a dedicated,
// suite-owned space. That keeps the counts deterministic without clearing the
// default space, and teardown removes exactly what the suite created.
const SPACE_ID = 'alerting-v2-match-action-policies';
const MATCH_ACTION_POLICIES_URL = `/s/${SPACE_ID}${testData.INTERNAL_ACTION_POLICY_MATCH_API_PATH}`;

apiTest.describe('Match action policies API', { tag: testData.API_ENGINE_TAG }, () => {
  let readerCredentials: RoleApiCredentials;
  let readerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
    readerCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_ACTION_POLICIES_READ_ROLE
    );
    readerHeaders = { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader };

    await apiServices.spaces.delete(SPACE_ID);
    await apiServices.spaces.create({ id: SPACE_ID, name: SPACE_ID });
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp({ spaceId: SPACE_ID });
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(SPACE_ID);
  });

  const createMatchFixtures = async (apiServices: AlertingApiServicesFixture) => {
    const tagged = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'Prod tagged policy', matcher: { tags: ['prod'] } }),
      { spaceId: SPACE_ID }
    );
    const catchAll = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'Catch-all policy' }),
      { spaceId: SPACE_ID }
    );
    const nonMatching = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({
        name: 'Staging tagged policy',
        matcher: { tags: ['staging'] },
      }),
      { spaceId: SPACE_ID }
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
