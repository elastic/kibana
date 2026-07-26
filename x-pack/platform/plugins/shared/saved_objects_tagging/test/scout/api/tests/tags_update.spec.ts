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
  'POST /api/saved_objects_tagging/tags/{id}',
  { tag: tags.stateful.classic },
  () => {
    let privilegedApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      privilegedApiCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    });

    apiTest.beforeEach(async ({ kbnClient }) => {
      await kbnClient.importExport.load(KBN_ARCHIVES.FUNCTIONAL_BASE);
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      await kbnClient.importExport.unload(KBN_ARCHIVES.FUNCTIONAL_BASE);
    });

    apiTest('updates the tag when validation succeeds', async ({ apiClient }) => {
      const updateResponse = await apiClient.post('api/saved_objects_tagging/tags/tag-1', {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
        body: {
          name: 'updated name',
          description: 'updated desc',
          color: '#123456',
        },
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body).toStrictEqual({
        tag: {
          id: 'tag-1',
          name: 'updated name',
          description: 'updated desc',
          color: '#123456',
          managed: false,
        },
      });

      const getResponse = await apiClient.get('api/saved_objects_tagging/tags/tag-1', {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body).toStrictEqual({
        tag: {
          id: 'tag-1',
          name: 'updated name',
          description: 'updated desc',
          color: '#123456',
          managed: false,
        },
      });
    });

    apiTest('does not allow updating a tag name to an existing name', async ({ apiClient }) => {
      const existingName = 'tag-3';
      const updateResponse = await apiClient.post('api/saved_objects_tagging/tags/tag-2', {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
        body: {
          name: existingName,
          description: 'updated desc',
          color: '#123456',
        },
      });

      expect(updateResponse).toHaveStatusCode(409);
      expect(updateResponse.body).toStrictEqual({
        statusCode: 409,
        error: 'Conflict',
        message: `A tag with the name "${existingName}" already exists.`,
      });

      const getResponse = await apiClient.get('api/saved_objects_tagging/tags/tag-3', {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body).toStrictEqual({
        tag: {
          id: 'tag-3',
          name: 'tag-3',
          description: 'Last but not least',
          color: '#000000',
          managed: false,
        },
      });
    });

    apiTest('returns 404 when trying to update a missing tag', async ({ apiClient }) => {
      const response = await apiClient.post('api/saved_objects_tagging/tags/unknown-tag-id', {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
        body: {
          name: 'updated name',
          description: 'updated desc',
          color: '#123456',
        },
      });

      expect(response).toHaveStatusCode(404);
      expect(response.body).toStrictEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Saved object [tag/unknown-tag-id] not found',
      });
    });

    apiTest('returns validation details when update payload is invalid', async ({ apiClient }) => {
      const response = await apiClient.post('api/saved_objects_tagging/tags/tag-1', {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
        body: {
          name: 'a',
          description: 'some desc',
          color: 'this is not a valid color',
        },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body).toStrictEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Error validating tag attributes',
        attributes: {
          valid: false,
          warnings: [],
          errors: {
            name: 'Tag name must be at least 2 characters',
            color: 'Tag color must be a valid hex color',
          },
        },
      });
    });
  }
);
