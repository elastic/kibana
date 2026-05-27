/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, PUBLIC_HEADERS, KBN_ARCHIVES } from '../fixtures';

apiTest.describe('tags - search', { tag: tags.deploymentAgnostic }, () => {
  let privilegedCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
    privilegedCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    await kbnClient.importExport.load(KBN_ARCHIVES.FUNCTIONAL_BASE);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.savedObjects.clean({ types: ['tag'] });
  });

  apiTest('searches tags (200)', async ({ apiClient }) => {
    const response = await apiClient.get('api/tags', {
      headers: { ...PUBLIC_HEADERS, ...privilegedCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(typeof response.body.meta.total).toBe('number');
    expect(typeof response.body.meta.page).toBe('number');
    expect(typeof response.body.meta.per_page).toBe('number');

    expect(response.body.meta.total).toBeGreaterThanOrEqual(1);
    expect(response.body.data.map((t: { id: string }) => t.id)).toContain('tag-1');
  });
});
