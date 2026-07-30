/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS } from '../constants';
import { apiTest } from '../fixtures';

/**
 * The `space` saved object type is hidden from the generic Saved Objects HTTP API:
 * spaces cannot be read, created, updated, or deleted through `/api/saved_objects/*`.
 */
apiTest.describe('`space` saved object type', { tag: tags.stateful.all }, () => {
  let adminApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
  });

  apiTest('should not return the default space via GET', async ({ apiClient }) => {
    const response = await apiClient.get('api/saved_objects/space/default', {
      headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body).toStrictEqual({
      message: 'Saved object [space/default] not found',
      statusCode: 404,
      error: 'Not Found',
    });
  });

  apiTest('should not locate any spaces via _find', async ({ apiClient }) => {
    const response = await apiClient.get('api/saved_objects/_find?type=space', {
      headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      page: 1,
      per_page: 20,
      total: 0,
      saved_objects: [],
    });
  });

  apiTest('should not allow a space to be created', async ({ apiClient }) => {
    const response = await apiClient.post('api/saved_objects/space/my-space', {
      headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
      body: { attributes: {} },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body).toStrictEqual({
      message: "Unsupported saved object type: 'space': Bad Request",
      statusCode: 400,
      error: 'Bad Request',
    });
  });

  apiTest('should not allow a space to be updated', async ({ apiClient }) => {
    const response = await apiClient.post('api/saved_objects/space/default', {
      headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
      body: { attributes: {} },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body).toStrictEqual({
      message: "Unsupported saved object type: 'space': Bad Request",
      statusCode: 400,
      error: 'Bad Request',
    });
  });

  apiTest('should not allow a space to be deleted', async ({ apiClient }) => {
    const response = await apiClient.delete('api/saved_objects/space/default', {
      headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body).toStrictEqual({
      message: 'Saved object [space/default] not found',
      statusCode: 404,
      error: 'Not Found',
    });
  });
});
