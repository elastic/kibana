/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  COMMON_HEADERS,
  INVALID_LENS_ID,
  KNOWN_LENS_ID,
  LENS_API_PATH,
  apiTest,
  getExampleLensBody,
} from '../../fixtures';

apiTest.describe('lens visualizations - update', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;
  let testTagId: string;

  apiTest.beforeAll(async ({ lensHelper, requestAuth }) => {
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    await lensHelper.loadLensExampleDocs();
    testTagId = await lensHelper.createTag('lens-update-test-tag');
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should update an existing lens visualization', async ({ apiClient }) => {
    const title = 'Custom title';

    const response = await apiClient.put(`${LENS_API_PATH}/${KNOWN_LENS_ID}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: getExampleLensBody(title),
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.data.title).toBe(title);
  });

  apiTest('should update without a tags field (backward compatibility)', async ({ apiClient }) => {
    const { tags: _omitted, ...bodyWithoutTags } = getExampleLensBody('No-tags title');

    const response = await apiClient.put(`${LENS_API_PATH}/${KNOWN_LENS_ID}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: bodyWithoutTags,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
  });

  apiTest('should persist tags through the update response', async ({ apiClient }) => {
    const response = await apiClient.put(`${LENS_API_PATH}/${KNOWN_LENS_ID}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: getExampleLensBody(undefined, undefined, [testTagId]),
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.data.tags).toStrictEqual([testTagId]);
  });

  apiTest('should upsert when no visualization exists for the id', async ({ apiClient }) => {
    const id = randomUUID();
    const title = 'Upsert title';

    const response = await apiClient.put(`${LENS_API_PATH}/${id}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: getExampleLensBody(title),
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body.id).toBe(id);
    expect(response.body.data.title).toBe(title);
  });

  apiTest(
    'should preserve created_at when updating an existing visualization',
    async ({ apiClient }) => {
      const createResponse = await apiClient.post(LENS_API_PATH, {
        headers: {
          ...COMMON_HEADERS,
          ...editorCredentials.apiKeyHeader,
        },
        body: getExampleLensBody('created-at original'),
        responseType: 'json',
      });

      expect(createResponse).toHaveStatusCode(201);
      const { id } = createResponse.body;
      const createdAt = createResponse.body.meta.created_at;
      expect(createdAt).toStrictEqual(expect.any(String));

      const updateResponse = await apiClient.put(`${LENS_API_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...editorCredentials.apiKeyHeader,
        },
        body: getExampleLensBody('created-at updated'),
        responseType: 'json',
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body.meta.created_at).toBe(createdAt);

      const getResponse = await apiClient.get(`${LENS_API_PATH}/${id}`, {
        headers: {
          ...COMMON_HEADERS,
          ...editorCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.meta.created_at).toBe(createdAt);
    }
  );

  apiTest('should fully replace nested chart configuration on update', async ({ apiClient }) => {
    const id = randomUUID();
    const withSecondary = {
      ...getExampleLensBody('with secondary'),
      metrics: [
        {
          type: 'primary' as const,
          operation: 'count' as const,
          label: 'Count of records',
          empty_as_null: true,
        },
        {
          type: 'secondary' as const,
          operation: 'count' as const,
          label: 'Secondary count',
          empty_as_null: true,
        },
      ],
    };

    const createResponse = await apiClient.put(`${LENS_API_PATH}/${id}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: withSecondary,
      responseType: 'json',
    });

    expect(createResponse).toHaveStatusCode(201);
    expect(createResponse.body.data.metrics).toHaveLength(2);

    const updateResponse = await apiClient.put(`${LENS_API_PATH}/${id}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: getExampleLensBody('primary only'),
      responseType: 'json',
    });

    expect(updateResponse).toHaveStatusCode(200);
    expect(updateResponse.body.data.metrics).toHaveLength(1);
    expect(updateResponse.body.data.metrics[0].type).toBe('primary');

    const getResponse = await apiClient.get(`${LENS_API_PATH}/${id}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(getResponse).toHaveStatusCode(200);
    expect(getResponse.body.data.metrics).toHaveLength(1);
    expect(getResponse.body.data.metrics[0].type).toBe('primary');
  });

  apiTest('validation - returns 400 for an invalid id', async ({ apiClient }) => {
    const response = await apiClient.put(`${LENS_API_PATH}/${INVALID_LENS_ID}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: getExampleLensBody('Some title'),
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain('ID must contain');
  });

  apiTest('validation - returns 400 when body is empty', async ({ apiClient }) => {
    const response = await apiClient.put(`${LENS_API_PATH}/${KNOWN_LENS_ID}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: {},
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    // TODO: assert `response.body.message` once the public API stabilizes its
    // validation messaging.
  });
});
