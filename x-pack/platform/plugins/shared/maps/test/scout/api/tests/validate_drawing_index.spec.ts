/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';

apiTest.describe('Maps - validate drawing index', { tag: [...tags.stateful.classic] }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, esArchiver, kbnClient }) => {
    cookieHeader = (await samlAuth.asInteractiveUser('admin')).cookieHeader;
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.mapsData);
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.maps);
  });

  apiTest.afterAll(async ({ esClient, kbnClient }) => {
    await esClient.indices.delete({ index: 'valid-drawing-index', ignore_unavailable: true });
    await kbnClient.importExport.unload(testData.KBN_ARCHIVES.maps);
  });

  apiTest('confirm valid drawing index', async ({ apiClient }) => {
    await apiClient.post('internal/maps/docSource', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      body: {
        index: 'valid-drawing-index',
        mappings: { properties: { coordinates: { type: 'geo_point' } } },
      },
    });

    const response = await apiClient.get(
      'internal/maps/checkIsDrawingIndex?index=valid-drawing-index',
      {
        headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.success).toBe(true);
    expect(response.body.isDrawingIndex).toBe(true);
  });

  apiTest('confirm valid index that is not a drawing index', async ({ apiClient }) => {
    const response = await apiClient.get('internal/maps/checkIsDrawingIndex?index=geo_shapes', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.success).toBe(true);
    expect(response.body.isDrawingIndex).toBe(false);
  });

  apiTest('confirm invalid index', async ({ apiClient }) => {
    const response = await apiClient.get('internal/maps/checkIsDrawingIndex?index=not-an-index', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.success).toBe(false);
  });
});
