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
  'POST /api/saved_objects_tagging/tags/create',
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

    apiTest('creates a tag when validation succeeds', async ({ apiClient }) => {
      const createResponse = await apiClient.post('api/saved_objects_tagging/tags/create', {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
        body: {
          name: 'my new tag',
          description: 'some desc',
          color: '#772299',
        },
      });

      expect(createResponse).toHaveStatusCode(200);

      const newTagId = createResponse.body.tag.id;
      expect(createResponse.body).toStrictEqual({
        tag: {
          id: newTagId,
          name: 'my new tag',
          description: 'some desc',
          color: '#772299',
          managed: false,
        },
      });

      const getResponse = await apiClient.get(`api/saved_objects_tagging/tags/${newTagId}`, {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body).toStrictEqual({
        tag: {
          id: newTagId,
          name: 'my new tag',
          description: 'some desc',
          color: '#772299',
          managed: false,
        },
      });

      const deleteResponse = await apiClient.delete(`api/saved_objects_tagging/tags/${newTagId}`, {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
      });
      expect(deleteResponse).toHaveStatusCode(200);
    });

    apiTest('returns validation details when create payload is invalid', async ({ apiClient }) => {
      const response = await apiClient.post('api/saved_objects_tagging/tags/create', {
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

    apiTest('does not create a tag with an existing name', async ({ apiClient }) => {
      const existingName = 'tag-1';
      const response = await apiClient.post('api/saved_objects_tagging/tags/create', {
        headers: {
          ...COMMON_HEADERS,
          ...privilegedApiCredentials.apiKeyHeader,
        },
        body: {
          name: existingName,
          description: 'some desc',
          color: '#000000',
        },
      });

      expect(response).toHaveStatusCode(409);
      expect(response.body).toStrictEqual({
        statusCode: 409,
        error: 'Conflict',
        message: `A tag with the name "${existingName}" already exists.`,
      });
    });
  }
);
