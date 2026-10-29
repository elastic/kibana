/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { TAGS_RESPONSE_LIMIT } from '@kbn/alerting-v2-constants';
import {
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  NO_ACCESS_ROLE,
  testData,
  type AlertingApiServicesFixture,
} from '../fixtures';

const ROUTING_TAGS_URL = testData.INTERNAL_ACTION_POLICY_ROUTING_TAGS_API_PATH;
const OTHER_SPACE_ID = 'action-policy-routing-tags-other';

const createPolicy = async (
  apiServices: AlertingApiServicesFixture,
  {
    name,
    matcher,
    enabled = true,
  }: { name: string; matcher?: { tags?: string[]; expression?: string }; enabled?: boolean }
) => {
  const policy = await apiServices.alertingV2.actionPolicies.create(
    buildCreateActionPolicyData({ name, ...(matcher ? { matcher } : {}) })
  );
  if (!enabled) {
    await apiServices.alertingV2.actionPolicies.disable(policy.id);
  }
  return policy;
};

apiTest.describe('Get action policy routing tags API', { tag: testData.API_ENGINE_TAG }, () => {
  let readerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
    const readerCredentials: RoleApiCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_ACTION_POLICIES_READ_ROLE
    );
    readerHeaders = { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader };

    await apiServices.spaces.delete(OTHER_SPACE_ID);
    await apiServices.spaces.create({ id: OTHER_SPACE_ID, name: OTHER_SPACE_ID });
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
    await apiServices.alertingV2.actionPolicies.cleanUp({ spaceId: OTHER_SPACE_ID });
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
    await apiServices.spaces.delete(OTHER_SPACE_ID);
  });

  apiTest('returns an empty result when no policy uses a routing tag', async ({ apiClient }) => {
    const response = await apiClient.get(ROUTING_TAGS_URL, { headers: readerHeaders });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ items: [], total_tags: 0, is_truncated: false });
  });

  apiTest(
    'grouping: attributes tags to policies, ignoring catch-all and expression-only policies and counting a repeated tag once',
    async ({ apiClient, apiServices }) => {
      const sre = await createPolicy(apiServices, {
        name: 'SRE on call',
        matcher: { tags: ['rna', 'sre'] },
      });
      const dup = await createPolicy(apiServices, {
        name: 'Dup tags',
        matcher: { tags: ['dup', 'dup'] },
      });
      await createPolicy(apiServices, { name: 'Catch-all' });
      await createPolicy(apiServices, {
        name: 'Expression only',
        matcher: { expression: 'severity: "critical"' },
      });

      const response = await apiClient.get(ROUTING_TAGS_URL, { headers: readerHeaders });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        items: [
          { tag: 'dup', policy_count: 1, policies: [{ id: dup.id, name: 'Dup tags' }] },
          { tag: 'rna', policy_count: 1, policies: [{ id: sre.id, name: 'SRE on call' }] },
          { tag: 'sre', policy_count: 1, policies: [{ id: sre.id, name: 'SRE on call' }] },
        ],
        total_tags: 3,
        is_truncated: false,
      });
    }
  );

  apiTest(
    'ordering: ranks tags by enabled policies, lists enabled policies first, and puts disabled-only tags last',
    async ({ apiClient, apiServices }) => {
      const zulu = await createPolicy(apiServices, { name: 'Zulu', matcher: { tags: ['rna'] } });
      const alpha = await createPolicy(apiServices, {
        name: 'Alpha',
        matcher: { tags: ['rna'] },
        enabled: false,
      });
      const mike = await createPolicy(apiServices, { name: 'Mike', matcher: { tags: ['rna'] } });
      const bravo = await createPolicy(apiServices, { name: 'Bravo', matcher: { tags: ['solo'] } });
      const legacy = await createPolicy(apiServices, {
        name: 'Legacy 1',
        matcher: { tags: ['legacy'] },
        enabled: false,
      });
      const legacyToo = await createPolicy(apiServices, {
        name: 'Legacy 2',
        matcher: { tags: ['legacy'] },
        enabled: false,
      });

      const response = await apiClient.get(ROUTING_TAGS_URL, { headers: readerHeaders });

      expect(response).toHaveStatusCode(200);
      expect(response.body.items).toStrictEqual([
        {
          tag: 'rna',
          policy_count: 3,
          policies: [
            { id: mike.id, name: 'Mike' },
            { id: zulu.id, name: 'Zulu' },
            { id: alpha.id, name: 'Alpha' },
          ],
        },
        { tag: 'solo', policy_count: 1, policies: [{ id: bravo.id, name: 'Bravo' }] },
        {
          tag: 'legacy',
          policy_count: 2,
          policies: [
            { id: legacy.id, name: 'Legacy 1' },
            { id: legacyToo.id, name: 'Legacy 2' },
          ],
        },
      ]);
    }
  );

  apiTest(
    'policies_per_tag: limits the listed policies without limiting policy_count',
    async ({ apiClient, apiServices }) => {
      for (const name of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
        await createPolicy(apiServices, { name: `Policy ${name}`, matcher: { tags: ['wide'] } });
      }

      const byDefault = await apiClient.get(ROUTING_TAGS_URL, { headers: readerHeaders });
      const limited = await apiClient.get(`${ROUTING_TAGS_URL}?policies_per_tag=2`, {
        headers: readerHeaders,
      });

      expect(byDefault).toHaveStatusCode(200);
      expect(byDefault.body.items[0].policy_count).toBe(7);
      expect(
        byDefault.body.items[0].policies.map(({ name }: { name: string }) => name)
      ).toStrictEqual(['Policy A', 'Policy B', 'Policy C', 'Policy D', 'Policy E']);
      expect(limited).toHaveStatusCode(200);
      expect(limited.body.items[0].policy_count).toBe(7);
      expect(
        limited.body.items[0].policies.map(({ name }: { name: string }) => name)
      ).toStrictEqual(['Policy A', 'Policy B']);
    }
  );

  apiTest(
    'search: filters tags by a case-sensitive prefix and counts only matching tags',
    async ({ apiClient, apiServices }) => {
      await createPolicy(apiServices, { name: 'One', matcher: { tags: ['rna', 'RNA', 'sre'] } });
      await createPolicy(apiServices, { name: 'Two', matcher: { tags: ['rna-extra'] } });

      const lower = await apiClient.get(`${ROUTING_TAGS_URL}?search=rna`, {
        headers: readerHeaders,
      });
      const upper = await apiClient.get(`${ROUTING_TAGS_URL}?search=RN`, {
        headers: readerHeaders,
      });
      const middle = await apiClient.get(`${ROUTING_TAGS_URL}?search=na`, {
        headers: readerHeaders,
      });

      expect(lower).toHaveStatusCode(200);
      expect(lower.body.items.map(({ tag }: { tag: string }) => tag)).toStrictEqual([
        'rna',
        'rna-extra',
      ]);
      expect(lower.body.total_tags).toBe(2);
      expect(upper.body.items.map(({ tag }: { tag: string }) => tag)).toStrictEqual(['RNA']);
      expect(middle.body).toStrictEqual({ items: [], total_tags: 0, is_truncated: false });
    }
  );

  apiTest(
    'total_tags: reports every matching tag when the list is limited to 20',
    async ({ apiClient, apiServices }) => {
      const tags = Array.from(
        { length: TAGS_RESPONSE_LIMIT + 1 },
        (_, i) => `tag-${String(i).padStart(2, '0')}`
      );
      await createPolicy(apiServices, { name: 'Many tags', matcher: { tags } });

      const response = await apiClient.get(ROUTING_TAGS_URL, { headers: readerHeaders });

      expect(response).toHaveStatusCode(200);
      expect(response.body.items).toHaveLength(TAGS_RESPONSE_LIMIT);
      expect(response.body.total_tags).toBe(TAGS_RESPONSE_LIMIT + 1);
      expect(response.body.is_truncated).toBe(false);
    }
  );

  apiTest(
    'space isolation: only counts policies in the space of the request',
    async ({ apiClient, apiServices }) => {
      const inDefault = await createPolicy(apiServices, {
        name: 'Default policy',
        matcher: { tags: ['rna'] },
      });
      const inOther = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'Other policy', matcher: { tags: ['rna', 'other'] } }),
        { spaceId: OTHER_SPACE_ID }
      );

      const defaultSpace = await apiClient.get(ROUTING_TAGS_URL, { headers: readerHeaders });
      const otherSpace = await apiClient.get(`/s/${OTHER_SPACE_ID}${ROUTING_TAGS_URL}`, {
        headers: readerHeaders,
      });

      expect(defaultSpace).toHaveStatusCode(200);
      expect(defaultSpace.body.items).toStrictEqual([
        { tag: 'rna', policy_count: 1, policies: [{ id: inDefault.id, name: 'Default policy' }] },
      ]);
      expect(otherSpace).toHaveStatusCode(200);
      expect(otherSpace.body.items).toStrictEqual([
        { tag: 'other', policy_count: 1, policies: [{ id: inOther.id, name: 'Other policy' }] },
        { tag: 'rna', policy_count: 1, policies: [{ id: inOther.id, name: 'Other policy' }] },
      ]);
    }
  );

  [
    { description: 'an unknown query parameter', query: 'page=1' },
    { description: 'policies_per_tag below 1', query: 'policies_per_tag=0' },
    { description: 'policies_per_tag above 20', query: 'policies_per_tag=21' },
    { description: 'a non-numeric policies_per_tag', query: 'policies_per_tag=many' },
    { description: 'a search longer than 256 characters', query: `search=${'a'.repeat(257)}` },
  ].forEach(({ description, query }) => {
    apiTest(`rejects ${description}`, async ({ apiClient }) => {
      const response = await apiClient.get(`${ROUTING_TAGS_URL}?${query}`, {
        headers: readerHeaders,
      });

      expect(response).toHaveStatusCode(400);
    });
  });

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);

      const response = await apiClient.get(ROUTING_TAGS_URL, {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
