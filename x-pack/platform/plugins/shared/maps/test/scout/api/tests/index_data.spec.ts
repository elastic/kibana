/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';

apiTest.describe('Maps - index feature data', { tag: [...tags.stateful.classic] }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    cookieHeader = (await samlAuth.asInteractiveUser('admin')).cookieHeader;
  });

  apiTest.afterAll(async ({ esClient }) => {
    await esClient.indices.delete({
      index: ['new-point-feature-index', 'new-shape-feature-index', 'new-feature-index2'],
      ignore_unavailable: true,
    });
  });

  apiTest('should add point data to an existing index', async ({ apiClient }) => {
    await apiClient.post('internal/maps/docSource', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      body: {
        index: 'new-point-feature-index',
        mappings: { properties: { coordinates: { type: 'geo_point' } } },
      },
    });

    const response = await apiClient.post('internal/maps/feature', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      body: {
        index: 'new-point-feature-index',
        data: { coordinates: [125.6, 10.1], name: 'Dinagat Islands' },
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.success).toBe(true);
  });

  apiTest('should add shape data to an existing index', async ({ apiClient }) => {
    await apiClient.post('internal/maps/docSource', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      body: {
        index: 'new-shape-feature-index',
        mappings: { properties: { coordinates: { type: 'geo_shape' } } },
      },
    });

    const response = await apiClient.post('internal/maps/feature', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      body: {
        index: 'new-shape-feature-index',
        data: {
          coordinates: {
            type: 'Polygon',
            coordinates: [
              [
                [-20.91796875, 25.64152637306577],
                [-13.0517578125, 25.64152637306577],
                [-13.0517578125, 31.203404950917395],
                [-20.91796875, 31.203404950917395],
                [-20.91796875, 25.64152637306577],
              ],
            ],
          },
        },
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.success).toBe(true);
  });

  apiTest('should fail if data is invalid', async ({ apiClient }) => {
    await apiClient.post('internal/maps/docSource', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      body: {
        index: 'new-feature-index2',
        mappings: { properties: { coordinates: { type: 'geo_point' } } },
      },
    });

    const response = await apiClient.post('internal/maps/feature', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      body: {
        index: 'new-feature-index2',
        data: { coordinates: [600, 800], name: 'Never Gonna Happen Islands' },
      },
    });

    expect(response).toHaveStatusCode(500);
  });

  apiTest('should fail if index does not exist', async ({ apiClient }) => {
    const response = await apiClient.post('internal/maps/feature', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      body: {
        index: 'not-an-index',
        data: { coordinates: [125.6, 10.1], name: 'Dinagat Islands' },
      },
    });

    expect(response).toHaveStatusCode(500);
  });
});
