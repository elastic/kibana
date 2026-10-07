/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, COMMON_HEADERS, KBN_ARCHIVES, NO_KIBANA_ACCESS_ROLE } from '../fixtures';

apiTest.describe('Saved Objects Tagging - find tags', { tag: tags.stateful.classic }, () => {
  let privilegedCookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    privilegedCookieHeader = (await samlAuth.asInteractiveUser('editor')).cookieHeader;
  });

  apiTest.beforeEach(async ({ kbnClient }) => {
    await kbnClient.importExport.load(KBN_ARCHIVES.RBAC_TAGS_DEFAULT_SPACE);
  });

  apiTest.afterEach(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(KBN_ARCHIVES.RBAC_TAGS_DEFAULT_SPACE);
  });

  apiTest('returns matching tags for privileged user', async ({ apiClient }) => {
    const response = await apiClient.get('internal/saved_objects_tagging/tags/_find?search=2', {
      headers: { ...COMMON_HEADERS, ...privilegedCookieHeader },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      tags: [
        {
          id: 'default-space-tag-2',
          name: 'tag-2',
          description: 'Tag 2 in default space',
          color: '#77CC11',
          relationCount: 0,
          managed: false,
        },
      ],
      total: 1,
    });
  });

  apiTest(
    'returns empty results for user without Kibana access',
    async ({ apiClient, samlAuth }) => {
      // _find proxies so.find and returns empty results rather than 403
      const { cookieHeader } = await samlAuth.asInteractiveUser(NO_KIBANA_ACCESS_ROLE);
      const response = await apiClient.get('internal/saved_objects_tagging/tags/_find?search=2', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ tags: [], total: 0 });
    }
  );
});
