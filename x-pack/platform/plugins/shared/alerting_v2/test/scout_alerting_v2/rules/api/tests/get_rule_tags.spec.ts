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
} from '../fixtures';

const TAGS_URL = `${testData.RULE_API_PATH}/tags`;
const OLD_TAGS_URL = `${testData.RULE_API_PATH}/_tags`;

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
    'tags: should return the unique union of tags across rules, sorted by usage',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'rule-a', tags: ['cpu', 'memory', 'production'] },
        })
      );
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-b', tags: ['cpu', 'memory'] } })
      );
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-c', tags: ['cpu'] } })
      );

      const response = await apiClient.get(TAGS_URL, {
        headers: readerHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ tags: ['cpu', 'memory', 'production'] });
    }
  );

  apiTest(
    'tags: should not include falsy entries for rules with no tags',
    async ({ apiClient, apiServices }) => {
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
    'kind: should only return tags from alert-kind rules when kind=alert',
    async ({ apiClient, apiServices }) => {
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
          recovery_strategy: undefined,
          metadata: { name: 'signal-rule', tags: ['signal-tag'] },
        })
      );

      const filtered = await apiClient.get(tagsUrl({ kind: 'alert' }), {
        headers: readerHeaders,
      });

      expect(filtered).toHaveStatusCode(200);
      expect(filtered.body.tags).toContain('alert-tag');
      expect(filtered.body.tags).not.toContain('signal-tag');
    }
  );

  apiTest(
    'kind: should only return tags from signal-kind rules when kind=signal',
    async ({ apiClient, apiServices }) => {
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
          recovery_strategy: undefined,
          metadata: { name: 'signal-rule', tags: ['signal-tag'] },
        })
      );

      const filtered = await apiClient.get(tagsUrl({ kind: 'signal' }), {
        headers: readerHeaders,
      });

      expect(filtered).toHaveStatusCode(200);
      expect(filtered.body.tags).toContain('signal-tag');
      expect(filtered.body.tags).not.toContain('alert-tag');
    }
  );

  apiTest(
    'search: should return only tags matching the prefix',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'rule-a', tags: ['production', 'prerelease', 'staging'] },
        })
      );

      const response = await apiClient.get(tagsUrl({ search: 'pro' }), {
        headers: readerHeaders,
      });

      expect(response).toHaveStatusCode(200);
      // prefix match: production matches, staging does not
      expect(response.body.tags).toContain('production');
      expect(response.body.tags).not.toContain('staging');
    }
  );

  apiTest(
    'search: should escape regex special characters in the prefix',
    async ({ apiClient, apiServices }) => {
      // A tag with a literal dot; search for 'a.b' must not match 'axb'
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'rule-a', tags: ['a.b-real', 'axb-fake'] },
        })
      );

      const response = await apiClient.get(tagsUrl({ search: 'a.b' }), {
        headers: readerHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toContain('a.b-real');
      expect(response.body.tags).not.toContain('axb-fake');
    }
  );

  apiTest(
    'search: should escape Elasticsearch-only regexp operators in the prefix',
    async ({ apiClient, apiServices }) => {
      // `<` opens an interval and `"` a quoted literal in the Lucene regexp the
      // terms aggregation `include` uses. Unescaped, either one makes the pattern
      // unparsable and the aggregation fails.
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'rule-operators', tags: ['<lt-real', '"quote-real'] },
        })
      );

      for (const [search, expectedTag] of [
        ['<', '<lt-real'],
        ['"', '"quote-real'],
      ]) {
        const response = await apiClient.get(tagsUrl({ search }), {
          headers: readerHeaders,
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.tags).toContain(expectedTag);
      }
    }
  );

  apiTest('cap: should return at most 20 tags', async ({ apiClient, apiServices }) => {
    // Each rule may have at most 20 tags, so create 21 rules each with a distinct tag
    // to produce 21 unique tags in total — enough to exercise the aggregation cap.
    await Promise.all(
      Array.from({ length: 21 }, (_, i) =>
        apiServices.alertingV2.rules.create(
          buildCreateRuleData({
            metadata: { name: `cap-rule-${i}`, tags: [`tag-${String(i).padStart(2, '0')}`] },
          })
        )
      )
    );

    const response = await apiClient.get(TAGS_URL, { headers: readerHeaders });

    expect(response).toHaveStatusCode(200);
    expect(response.body.tags.length).toBeLessThanOrEqual(20);
  });

  apiTest('validation: should return 400 for an invalid kind', async ({ apiClient }) => {
    const response = await apiClient.get(tagsUrl({ kind: 'invalid_kind' }), {
      headers: readerHeaders,
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: should return 400 when the removed filter param is sent',
    async ({ apiClient }) => {
      const url = `${TAGS_URL}?filter=kind%3Aalert`;
      const response = await apiClient.get(url, {
        headers: readerHeaders,
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('validation: should return 400 for unknown query parameters', async ({ apiClient }) => {
    const url = `${TAGS_URL}?unknown_param=value`;
    const response = await apiClient.get(url, {
      headers: readerHeaders,
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('path: old /_tags path should return 404', async ({ apiClient }) => {
    const response = await apiClient.get(OLD_TAGS_URL, {
      headers: readerHeaders,
    });

    expect(response).toHaveStatusCode(404);
  });

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
