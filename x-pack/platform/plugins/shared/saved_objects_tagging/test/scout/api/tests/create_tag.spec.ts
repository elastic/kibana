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

apiTest.describe('tags - create', { tag: tags.deploymentAgnostic }, () => {
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

  apiTest('creates a tag (201)', async ({ apiClient }) => {
    const createResponse = await apiClient.post('api/tags', {
      headers: { ...PUBLIC_HEADERS, ...editorCredentials.apiKeyHeader },
      body: {
        name: 'my new tag',
        description: 'some desc',
        color: '#772299',
      },
      responseType: 'json',
    });

    expect(createResponse).toHaveStatusCode(201);
    expect(createResponse.body.id).toBeDefined();
    expect(createResponse.body.data).toStrictEqual({
      name: 'my new tag',
      description: 'some desc',
      color: '#772299',
    });
    expect(createResponse.body.meta).toMatchObject({ managed: false });

    const newTagId = createResponse.body.id as string;

    const getResponse = await apiClient.get(`api/tags/${newTagId}`, {
      headers: { ...PUBLIC_HEADERS, ...editorCredentials.apiKeyHeader },
      responseType: 'json',
    });
    expect(getResponse).toHaveStatusCode(200);
    expect(getResponse.body.id).toBe(newTagId);
    expect(getResponse.body.data).toStrictEqual({
      name: 'my new tag',
      description: 'some desc',
      color: '#772299',
    });
    expect(getResponse.body.meta).toMatchObject({ managed: false });
  });

  apiTest('creates a tag with a generated color when omitted (201)', async ({ apiClient }) => {
    const createResponse = await apiClient.post('api/tags', {
      headers: { ...PUBLIC_HEADERS, ...editorCredentials.apiKeyHeader },
      body: {
        name: 'tag without color',
      },
      responseType: 'json',
    });

    expect(createResponse).toHaveStatusCode(201);
    expect(createResponse.body.data.name).toBe('tag without color');
    expect(Object.prototype.hasOwnProperty.call(createResponse.body.data, 'description')).toBe(
      false
    );
    expect(createResponse.body.data.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  apiTest('returns details when validation fails (400)', async ({ apiClient }) => {
    const response = await apiClient.post('api/tags', {
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

  apiTest('returns 409 when name already exists', async ({ apiClient }) => {
    const existingName = 'tag-1';

    const response = await apiClient.post('api/tags', {
      headers: { ...PUBLIC_HEADERS, ...editorCredentials.apiKeyHeader },
      body: {
        name: existingName,
        description: 'some desc',
        color: '#000000',
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(409);
    expect(response.body).toMatchObject({
      message: `A tag with the name "${existingName}" already exists.`,
    });
  });

  apiTest(
    'authorization - returns error if user does not have permission to create a tag',
    async ({ apiClient }) => {
      const response = await apiClient.post('api/tags', {
        headers: { ...PUBLIC_HEADERS, ...viewerCredentials.apiKeyHeader },
        body: {
          name: 'forbidden',
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body.message).toBe('Unable to create tag');
    }
  );
});
