/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  PUBLIC_HEADERS,
  KBN_ARCHIVES,
  SO_TAGGING_WRITE_ROLE,
  SO_TAGGING_READ_ROLE,
} from '../fixtures';

apiTest.describe('tags - delete', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
    editorCredentials = await requestAuth.getApiKeyForCustomRole(SO_TAGGING_WRITE_ROLE);
    viewerCredentials = await requestAuth.getApiKeyForCustomRole(SO_TAGGING_READ_ROLE);
    await kbnClient.importExport.load(KBN_ARCHIVES.FUNCTIONAL_BASE);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.savedObjects.clean({ types: ['tag'] });
  });

  apiTest('returns 404 when deleting a missing tag', async ({ apiClient }) => {
    const id = 'does-not-exist';
    const response = await apiClient.delete(`api/tags/${id}`, {
      headers: { ...PUBLIC_HEADERS, ...editorCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body).toMatchObject({
      message: `A tag with ID [${id}] was not found.`,
    });
  });

  apiTest(
    'authorization - returns 403 when user is not authorized to delete the tag',
    async ({ apiClient }) => {
      const response = await apiClient.delete('api/tags/tag-1', {
        headers: { ...PUBLIC_HEADERS, ...viewerCredentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body.message).toBe('Unable to delete tag');
    }
  );

  apiTest('deletes an existing tag (204)', async ({ apiClient }) => {
    const deleteResponse = await apiClient.delete('api/tags/tag-2', {
      headers: { ...PUBLIC_HEADERS, ...editorCredentials.apiKeyHeader },
    });
    expect(deleteResponse).toHaveStatusCode(204);

    const getResponse = await apiClient.get('api/tags/tag-2', {
      headers: { ...PUBLIC_HEADERS, ...editorCredentials.apiKeyHeader },
      responseType: 'json',
    });
    expect(getResponse).toHaveStatusCode(404);
    expect(getResponse.body).toMatchObject({
      message: 'A tag with ID [tag-2] was not found.',
    });
  });
});
