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

apiTest.describe('tags - get', { tag: tags.deploymentAgnostic }, () => {
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
    viewerCredentials = await requestAuth.getTagsViewerApiKey();
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.tagsFunctionalBase);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.savedObjects.clean({ types: ['tag'] });
  });

  apiTest('returns 200 when tag exists', async ({ apiClient }) => {
    const response = await apiClient.get('api/tags/tag-1', {
      headers: { ...testData.PUBLIC_HEADERS, ...viewerCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toBe('tag-1');
    expect(response.body.data.name).toBe('tag-1');
  });

  apiTest('returns 404 when tag does not exist', async ({ apiClient }) => {
    const id = 'does-not-exist';
    const response = await apiClient.get(`api/tags/${id}`, {
      headers: { ...testData.PUBLIC_HEADERS, ...viewerCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body).toMatchObject({
      message: `A tag with ID [${id}] was not found.`,
    });
  });
});
