/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';

apiTest.describe('Maps - fonts', { tag: [...tags.stateful.classic] }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    cookieHeader = (await samlAuth.asInteractiveUser('viewer')).cookieHeader;
  });

  apiTest('should return fonts', async ({ apiClient }) => {
    const response = await apiClient.get(
      'internal/maps/fonts/Open%20Sans%20Regular,Arial%20Unicode%20MS%20Regular/0-255',
      {
        headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'buffer',
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body).toHaveLength(74696);
  });

  apiTest('should return 404 when file not found', async ({ apiClient }) => {
    const response = await apiClient.get(
      'internal/maps/fonts/Open%20Sans%20Regular,Arial%20Unicode%20MS%20Regular/noGonaFindMe',
      {
        headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(404);
  });

  apiTest('should return 404 when file is not in font folder (..)', async ({ apiClient }) => {
    const response = await apiClient.get('internal/maps/fonts/open_sans/..%2f0-255', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('should return 404 when file is not in font folder (./..)', async ({ apiClient }) => {
    const response = await apiClient.get('internal/maps/fonts/open_sans/.%2f..%2f0-255', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
  });
});
