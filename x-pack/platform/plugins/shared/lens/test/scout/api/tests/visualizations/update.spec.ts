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

  apiTest.beforeAll(async ({ lensHelper, requestAuth }) => {
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    await lensHelper.loadLensExampleDocs();
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
    expect(response.body.message).toBe(
      'ID must contain only lowercase letters, numbers, hyphens, and underscores.'
    );
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
