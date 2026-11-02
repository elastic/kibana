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

apiTest.describe('lens visualizations - delete', { tag: tags.deploymentAgnostic }, () => {
  let editorCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ lensHelper, requestAuth }) => {
    editorCredentials = await requestAuth.getApiKeyForPrivilegedUser();
    await lensHelper.loadLensExampleDocs();
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  apiTest('should delete an existing lens visualization', async ({ apiClient }) => {
    const response = await apiClient.delete(`${LENS_API_PATH}/${KNOWN_LENS_ID}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(204);
  });

  apiTest('should return 404 when deleting a non-existent visualization', async ({ apiClient }) => {
    const missingId = randomUUID();

    const response = await apiClient.delete(`${LENS_API_PATH}/${missingId}`, {
      headers: {
        ...COMMON_HEADERS,
        ...editorCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body.message).toBe(`A visualization with id [${missingId}] was not found.`);
  });
});
