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

  apiTest('should return 404 when updating a non-existent visualization', async ({ apiClient }) => {
    const missingId = randomUUID();

    const response = await apiClient.put(`${LENS_API_PATH}/${missingId}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: getExampleLensBody('Custom title'),
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body.message).toBe(
      `A Lens visualization with id [${missingId}] was not found.`
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
    // TODO: assert `response.body.message` once the API stabilizes its
    // validation messaging.
  });
});
