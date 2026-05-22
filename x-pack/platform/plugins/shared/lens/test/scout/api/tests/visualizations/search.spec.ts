/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS, LENS_API_PATH, apiTest } from '../../fixtures';

apiTest.describe('lens visualizations - search', { tag: tags.deploymentAgnostic }, () => {
  let viewerCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ lensHelper, requestAuth }) => {
    viewerCredentials = await requestAuth.getApiKeyForViewer();
    await lensHelper.loadLensExampleDocs();
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should return the list of lens visualizations', async ({ apiClient }) => {
    const response = await apiClient.get(LENS_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.data).toHaveLength(4);
  });

  apiTest('should filter visualizations by title and description', async ({ apiClient }) => {
    const response = await apiClient.get(`${LENS_API_PATH}?query=1`, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.data).toHaveLength(2);
  });

  apiTest('validation - returns 400 for unknown query params', async ({ apiClient }) => {
    const response = await apiClient.get(`${LENS_API_PATH}?xyz=unknown`, {
      headers: {
        ...COMMON_HEADERS,
        ...viewerCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toBe(
      "[request query.xyz]: Additional properties are not allowed ('xyz' was unexpected)"
    );
  });
});
