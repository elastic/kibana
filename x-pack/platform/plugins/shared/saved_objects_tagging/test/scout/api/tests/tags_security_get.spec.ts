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

apiTest.describe('Saved Objects Tagging - get tag', { tag: tags.stateful.classic }, () => {
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

  apiTest('returns tag data for user with SO tagging read access', async ({ apiClient }) => {
    const response = await apiClient.get('api/saved_objects_tagging/tags/default-space-tag-1', {
      headers: { ...COMMON_HEADERS, ...viewerCredentials.apiKeyHeader },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      tag: {
        id: 'default-space-tag-1',
        name: 'tag-1',
        description: 'Tag 1 in default space',
        color: '#FF00FF',
        managed: false,
      },
    });
  });

  apiTest('returns 403 for user without Kibana access', async ({ apiClient }) => {
    const response = await apiClient.get('api/saved_objects_tagging/tags/default-space-tag-1', {
      headers: { ...COMMON_HEADERS, ...noAccessCookieHeader },
    });
    expect(response).toHaveStatusCode(403);
    expect(response.body).toStrictEqual({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Unable to get tag',
    });
  });
});
