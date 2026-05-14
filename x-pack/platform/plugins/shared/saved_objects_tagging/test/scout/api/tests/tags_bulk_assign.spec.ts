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
  'POST /api/saved_objects_tagging/assignments/update_by_tags',
  { tag: tags.stateful.classic },
  () => {
    let privilegedApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      privilegedApiCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    });

    apiTest.beforeEach(async ({ kbnClient }) => {
      await kbnClient.importExport.load(KBN_ARCHIVES.BULK_ASSIGN);
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      await kbnClient.importExport.unload(KBN_ARCHIVES.BULK_ASSIGN);
    });

    apiTest('allows to update tag assignments', async ({ apiClient }) => {
      const updateResponse = await apiClient.post(
        'api/saved_objects_tagging/assignments/update_by_tags',
        {
          headers: {
            ...COMMON_HEADERS,
            ...privilegedApiCredentials.apiKeyHeader,
          },
          body: {
            tags: ['tag-1', 'tag-2'],
            assign: [{ type: 'dashboard', id: 'ref-to-tag-1-and-tag-3' }],
            unassign: [{ type: 'visualization', id: 'ref-to-tag-1' }],
          },
        }
      );
      expect(updateResponse).toHaveStatusCode(200);

      const bulkResponse = await apiClient.post('api/saved_objects/_bulk_get', {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
        body: [
          { type: 'dashboard', id: 'ref-to-tag-1-and-tag-3' },
          { type: 'visualization', id: 'ref-to-tag-1' },
        ],
      });

      expect(bulkResponse).toHaveStatusCode(200);

      const [dashboard, visualization] = bulkResponse.body.saved_objects as Array<{
        references: Array<{ id: string }>;
      }>;

      expect(dashboard.references.map(({ id }) => id)).toStrictEqual(['tag-1', 'tag-3', 'tag-2']);
      expect(visualization.references.map(({ id }) => id)).toStrictEqual([]);
    });

    apiTest('returns an error when assigning to non-taggable types', async ({ apiClient }) => {
      const response = await apiClient.post(
        'api/saved_objects_tagging/assignments/update_by_tags',
        {
          headers: {
            ...COMMON_HEADERS,
            ...privilegedApiCredentials.apiKeyHeader,
          },
          body: {
            tags: ['tag-1', 'tag-2'],
            assign: [{ type: 'config', id: 'foo' }],
            unassign: [{ type: 'visualization', id: 'ref-to-tag-1' }],
          },
        }
      );

      expect(response).toHaveStatusCode(400);
      expect(response.body).toStrictEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Unsupported type [config]',
      });

      const bulkResponse = await apiClient.post('api/saved_objects/_bulk_get', {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
        body: [{ type: 'visualization', id: 'ref-to-tag-1' }],
      });
      expect(bulkResponse).toHaveStatusCode(200);

      const [visualization] = bulkResponse.body.saved_objects as Array<{
        references: Array<{ id: string }>;
      }>;
      expect(visualization.references.map(({ id }) => id)).toStrictEqual(['tag-1']);
    });

    apiTest(
      'returns an error when both `assign` and `unassign` are unspecified',
      async ({ apiClient }) => {
        const response = await apiClient.post(
          'api/saved_objects_tagging/assignments/update_by_tags',
          {
            headers: {
              ...COMMON_HEADERS,
              ...privilegedApiCredentials.apiKeyHeader,
            },
            body: {
              tags: ['tag-1', 'tag-2'],
              assign: undefined,
              unassign: undefined,
            },
          }
        );

        expect(response).toHaveStatusCode(400);
        expect(response.body).toStrictEqual({
          statusCode: 400,
          error: 'Bad Request',
          message: '[request body]: either `assign` or `unassign` must be specified',
        });
      }
    );
  }
);
