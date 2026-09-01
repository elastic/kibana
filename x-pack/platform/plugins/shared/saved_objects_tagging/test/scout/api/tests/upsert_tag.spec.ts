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

apiTest.describe('tags - upsert', { tag: tags.deploymentAgnostic }, () => {
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

  apiTest('updates an existing tag (200)', async ({ apiClient }) => {
    const updateResponse = await apiClient.put('api/tags/tag-1', {
      headers: { ...PUBLIC_HEADERS, ...editorCredentials.apiKeyHeader },
      body: {
        name: 'updated name',
        description: 'updated desc',
        color: '#123456',
      },
      responseType: 'json',
    });

    expect(updateResponse).toHaveStatusCode(200);
    expect(updateResponse.body.id).toBe('tag-1');
    expect(updateResponse.body.data).toStrictEqual({
      name: 'updated name',
      description: 'updated desc',
      color: '#123456',
    });
    expect(updateResponse.body.meta).toMatchObject({ managed: false });
  });

  apiTest('creates a tag at the provided id (201)', async ({ apiClient }) => {
    const id = `created-via-put-${Date.now()}`;
    const createResponse = await apiClient.put(`api/tags/${id}`, {
      headers: { ...PUBLIC_HEADERS, ...editorCredentials.apiKeyHeader },
      body: {
        name: 'created name',
        description: 'created desc',
        color: '#654321',
      },
      responseType: 'json',
    });

    expect(createResponse).toHaveStatusCode(201);
    expect(createResponse.body.id).toBe(id);
    expect(createResponse.body.data).toStrictEqual({
      name: 'created name',
      description: 'created desc',
      color: '#654321',
    });
  });

  apiTest('creates a tag with a generated color when omitted (201)', async ({ apiClient }) => {
    const id = `created-via-put-no-color-${Date.now()}`;
    const createResponse = await apiClient.put(`api/tags/${id}`, {
      headers: { ...PUBLIC_HEADERS, ...editorCredentials.apiKeyHeader },
      body: {
        name: 'created name no color',
      },
      responseType: 'json',
    });

    expect(createResponse).toHaveStatusCode(201);
    expect(createResponse.body.id).toBe(id);
    expect(createResponse.body.data.name).toBe('created name no color');
    expect(Object.prototype.hasOwnProperty.call(createResponse.body.data, 'description')).toBe(
      false
    );
    expect(createResponse.body.data.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(createResponse.body.meta).toMatchObject({ managed: false });
  });

  apiTest('returns 409 when updating to an existing name', async ({ apiClient }) => {
    const response = await apiClient.put('api/tags/tag-2', {
      headers: { ...PUBLIC_HEADERS, ...editorCredentials.apiKeyHeader },
      body: {
        name: 'tag-3',
        description: 'updated desc',
        color: '#123456',
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(409);
    expect(response.body).toMatchObject({
      message: 'A tag with the name "tag-3" already exists.',
    });
  });

  apiTest('returns details when validation fails (400)', async ({ apiClient }) => {
    const response = await apiClient.put(`api/tags/validation-failure-${Date.now()}`, {
      headers: { ...PUBLIC_HEADERS, ...editorCredentials.apiKeyHeader },
      body: {
        name: 'a',
        description: 'some desc',
        color: 'this is not a valid color',
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body).toMatchObject({
      message: 'Error validating tag attributes',
      attributes: {
        valid: false,
        errors: expect.objectContaining({
          name: 'Tag name must be at least 2 characters',
          color: 'Tag color must be a valid hex color',
        }),
      },
    });
  });

  apiTest(
    'authorization - returns 403 when user does not have permission to update a tag',
    async ({ apiClient }) => {
      const response = await apiClient.put('api/tags/tag-1', {
        headers: { ...PUBLIC_HEADERS, ...viewerCredentials.apiKeyHeader },
        body: {
          name: 'unauthorized update',
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body.message).toBe('Unable to update tag');
    }
  );
});
