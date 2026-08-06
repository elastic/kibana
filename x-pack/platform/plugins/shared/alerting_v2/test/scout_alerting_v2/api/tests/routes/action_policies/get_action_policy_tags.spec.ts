/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  ALERTING_V2_ACTION_POLICIES_ALL_ROLE,
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

const TAGS_URL = `${testData.ACTION_POLICY_API_PATH}/tags`;
const OLD_TAGS_URL = `${testData.ACTION_POLICY_API_PATH}/suggestions/tags`;

const tagsUrl = (params: Record<string, string | undefined> = {}): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${TAGS_URL}?${qs}` : TAGS_URL;
};

apiTest.describe('Get action policy tags API', { tag: '@local-stateful-classic' }, () => {
  let readerCredentials: RoleApiCredentials;
  let readerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    readerCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_ACTION_POLICIES_READ_ROLE
    );
    readerHeaders = { ...readerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  apiTest(
    'tags: should return an empty tags array when no action policies exist',
    async ({ apiClient }) => {
      const response = await apiClient.get(TAGS_URL, { headers: readerHeaders });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ tags: [] });
    }
  );

  apiTest(
    'tags: should return tags in a wrapped { tags } response shape',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'policy-a', tags: ['cpu'] })
      );

      const response = await apiClient.get(TAGS_URL, { headers: readerHeaders });

      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body.tags)).toBe(true);
      expect(response.body.tags).toContain('cpu');
    }
  );

  apiTest(
    'search: should return only tags matching the prefix',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'policy-a',
          tags: ['production', 'prerelease', 'staging'],
        })
      );

      const response = await apiClient.get(tagsUrl({ search: 'pro' }), {
        headers: readerHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toContain('production');
      expect(response.body.tags).not.toContain('staging');
    }
  );

  apiTest(
    'search: should escape regex special characters in the prefix',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'policy-a', tags: ['a.b-real', 'axb-fake'] })
      );

      const response = await apiClient.get(tagsUrl({ search: 'a.b' }), {
        headers: readerHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toContain('a.b-real');
      expect(response.body.tags).not.toContain('axb-fake');
    }
  );

  apiTest('cap: should return at most 20 tags', async ({ apiClient, apiServices }) => {
    // Each action policy may have at most 20 tags, so create 21 policies each with a distinct tag
    // to produce 21 unique tags in total — enough to exercise the aggregation cap.
    await Promise.all(
      Array.from({ length: 21 }, (_, i) =>
        apiServices.alertingV2.actionPolicies.create(
          buildCreateActionPolicyData({
            name: `cap-policy-${i}`,
            tags: [`tag-${String(i).padStart(2, '0')}`],
          })
        )
      )
    );

    const response = await apiClient.get(TAGS_URL, { headers: readerHeaders });

    expect(response).toHaveStatusCode(200);
    expect(response.body.tags.length).toBeLessThanOrEqual(20);
  });

  apiTest(
    'validation: should return 400 when unknown query parameters are sent',
    async ({ apiClient }) => {
      const url = `${TAGS_URL}?unknown_param=value`;
      const response = await apiClient.get(url, { headers: readerHeaders });

      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest('path: old /suggestions/tags path should return 404', async ({ apiClient }) => {
    const response = await apiClient.get(OLD_TAGS_URL, { headers: readerHeaders });

    expect(response).toHaveStatusCode(404);
  });

  apiTest(
    'authorization: should return 200 for a user with read-only action policy privileges',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'visible-to-readers', tags: ['cpu'] })
      );

      const response = await apiClient.get(TAGS_URL, { headers: readerHeaders });

      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toContain('cpu');
    }
  );

  apiTest(
    'authorization: should return 200 for a user with full action policy privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'visible-to-writers', tags: ['memory'] })
      );
      const writerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_ALL_ROLE
      );

      const response = await apiClient.get(TAGS_URL, {
        headers: writerCredentials.apiKeyHeader,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toContain('memory');
    }
  );

  apiTest(
    'authorization: should return 403 for a user without action policy privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'hidden-policy', tags: ['cpu'] })
      );
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);

      const response = await apiClient.get(TAGS_URL, {
        headers: noAccessCredentials.apiKeyHeader,
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
