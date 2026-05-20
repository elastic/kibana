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

import { COMMON_HEADERS, KNOWN_LENS_ID, LENS_API_PATH, apiTest } from '../../fixtures';

apiTest.describe('lens visualizations - get', { tag: tags.deploymentAgnostic }, () => {
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ lensHelper, requestAuth }) => {
    viewerCredentials = await requestAuth.getApiKeyForViewer();
    await lensHelper.loadLensExampleDocs();
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should get a lens visualization by id', async ({ apiClient }) => {
    const response = await apiClient.get(`${LENS_API_PATH}/${KNOWN_LENS_ID}`, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.data.title).toBe('Lens example - 1');
  });

  apiTest('should return 404 for a non-existent lens visualization', async ({ apiClient }) => {
    const missingId = randomUUID();

    const response = await apiClient.get(`${LENS_API_PATH}/${missingId}`, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body.message).toBe(`A visualization with id [${missingId}] was not found.`);
  });
});
