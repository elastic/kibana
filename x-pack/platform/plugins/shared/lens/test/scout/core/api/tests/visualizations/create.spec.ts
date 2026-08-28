/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS, LENS_API_PATH, apiTest, getExampleLensBody } from '../../fixtures';

apiTest.describe('lens visualizations - create', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ lensHelper, requestAuth }) => {
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    await lensHelper.createSampleDataView();
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should create a lens visualization', async ({ apiClient }) => {
    const description = 'new lens vis';

    const response = await apiClient.post(LENS_API_PATH, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      body: getExampleLensBody(undefined, description),
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body.data.description).toBe(description);
  });

  apiTest('validation - returns 400 when body is empty', async ({ apiClient }) => {
    const response = await apiClient.post(LENS_API_PATH, {
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
