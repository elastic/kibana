/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

apiTest.describe('tags - list', { tag: tags.deploymentAgnostic }, () => {
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
    viewerCredentials = await requestAuth.getApiKeyForViewer();
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.tagsFunctionalBase);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.savedObjects.clean({ types: ['tag'] });
  });

  apiTest('lists tags (200)', async ({ apiClient }) => {
    const response = await apiClient.get('api/tags', {
      headers: { ...testData.PUBLIC_HEADERS, ...viewerCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(Array.isArray(response.body.tags)).toBe(true);
    expect(typeof response.body.total).toBe('number');
    expect(typeof response.body.page).toBe('number');

    expect(response.body.total).toBeGreaterThanOrEqual(1);
    expect(response.body.tags.map((t: { id: string }) => t.id)).toContain('tag-1');
  });
});
