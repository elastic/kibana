/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, COMMON_HEADERS, KBN_ARCHIVES, NO_KIBANA_ACCESS_ROLE } from '../fixtures';

apiTest.describe('Saved Objects Tagging - get all tags', { tag: tags.stateful.classic }, () => {
  let viewerCredentials: RoleApiCredentials;
  let noAccessCookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth, samlAuth }) => {
    viewerCredentials = await requestAuth.getApiKeyForViewer();
    noAccessCookieHeader = (await samlAuth.asInteractiveUser(NO_KIBANA_ACCESS_ROLE)).cookieHeader;
  });

  apiTest.beforeEach(async ({ kbnClient }) => {
    await kbnClient.importExport.load(KBN_ARCHIVES.RBAC_TAGS_DEFAULT_SPACE);
  });

  apiTest.afterEach(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(KBN_ARCHIVES.RBAC_TAGS_DEFAULT_SPACE);
  });

  apiTest(
    'returns all default-space tags for user with SO tagging read access',
    async ({ apiClient }) => {
      const response = await apiClient.get('api/saved_objects_tagging/tags', {
        headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toBeInstanceOf(Array);
      // filter out managed tags because this test is just to ensure space isolation, not full tag inventory
      const sortedTags = (response.body.tags as Array<{ id: string; managed: boolean }>)
        .filter((tag) => !tag.managed)
        .sort((a, b) => a.id.localeCompare(b.id));
      expect(sortedTags).toStrictEqual([
        {
          id: 'default-space-tag-1',
          name: 'tag-1',
          description: 'Tag 1 in default space',
          color: '#FF00FF',
          managed: false,
        },
        {
          id: 'default-space-tag-2',
          name: 'tag-2',
          description: 'Tag 2 in default space',
          color: '#77CC11',
          managed: false,
        },
      ]);
    }
  );

  apiTest('does not return tags from other spaces', async ({ kbnClient, apiClient }) => {
    await kbnClient.spaces.create({ id: 'space_1', name: 'Space 1' });
    try {
      await kbnClient.importExport.load(KBN_ARCHIVES.RBAC_TAGS_SPACE_1, { space: 'space_1' });
      const response = await apiClient.get('api/saved_objects_tagging/tags', {
        headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toBeInstanceOf(Array);
      // filter out managed tags because this test is just to ensure space isolation, not full tag inventory
      const sortedTags = (response.body.tags as Array<{ id: string; managed: boolean }>)
        .filter((tag) => !tag.managed)
        .sort((a, b) => a.id.localeCompare(b.id));
      expect(sortedTags).toStrictEqual([
        {
          id: 'default-space-tag-1',
          name: 'tag-1',
          description: 'Tag 1 in default space',
          color: '#FF00FF',
          managed: false,
        },
        {
          id: 'default-space-tag-2',
          name: 'tag-2',
          description: 'Tag 2 in default space',
          color: '#77CC11',
          managed: false,
        },
      ]);
    } finally {
      await kbnClient.importExport.unload(KBN_ARCHIVES.RBAC_TAGS_SPACE_1, { space: 'space_1' });
      await kbnClient.spaces.delete('space_1');
    }
  });

  apiTest('returns 403 for user without Kibana access', async ({ apiClient }) => {
    const response = await apiClient.get('api/saved_objects_tagging/tags', {
      headers: { ...COMMON_HEADERS, ...noAccessCookieHeader },
    });
    expect(response).toHaveStatusCode(403);
    expect(response.body).toStrictEqual({
      error: 'Forbidden',
      message: 'unauthorized',
      statusCode: 403,
    });
  });
});
