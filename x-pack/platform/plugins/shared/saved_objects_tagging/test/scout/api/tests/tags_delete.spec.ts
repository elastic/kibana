/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, COMMON_HEADERS, KBN_ARCHIVES } from '../fixtures';

apiTest.describe(
  'DELETE /api/saved_objects_tagging/tags/{id}',
  { tag: tags.stateful.classic },
  () => {
    let privilegedApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      privilegedApiCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    });

    apiTest.beforeEach(async ({ kbnClient }) => {
      await kbnClient.importExport.load(KBN_ARCHIVES.DELETE_WITH_REFERENCES);
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      await kbnClient.importExport.unload(KBN_ARCHIVES.DELETE_WITH_REFERENCES);
    });

    apiTest('deletes a tag', async ({ apiClient }) => {
      const existingTag = await apiClient.get('api/saved_objects_tagging/tags/tag-1', {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
      });
      expect(existingTag).toHaveStatusCode(200);

      const deleteResponse = await apiClient.delete('api/saved_objects_tagging/tags/tag-1', {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
      });
      expect(deleteResponse).toHaveStatusCode(200);

      const deletedTag = await apiClient.get('api/saved_objects_tagging/tags/tag-1', {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
      });
      expect(deletedTag).toHaveStatusCode(404);
    });

    apiTest('removes references to a deleted tag', async ({ apiClient }) => {
      const existingTag = await apiClient.get('api/saved_objects_tagging/tags/tag-1', {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
      });
      expect(existingTag).toHaveStatusCode(200);

      const deleteResponse = await apiClient.delete('api/saved_objects_tagging/tags/tag-1', {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
      });
      expect(deleteResponse).toHaveStatusCode(200);

      const bulkResponse = await apiClient.post('api/saved_objects/_bulk_get', {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
        body: [
          { type: 'visualization', id: 'ref-to-tag-1' },
          { type: 'visualization', id: 'ref-to-tag-1-and-tag-2' },
        ],
      });

      expect(bulkResponse).toHaveStatusCode(200);

      const [vis1, vis2] = bulkResponse.body.saved_objects;

      expect(vis1.references).toStrictEqual([]);
      expect(vis2.references).toStrictEqual([{ type: 'tag', id: 'tag-2', name: 'tag-2' }]);
    });
  }
);
