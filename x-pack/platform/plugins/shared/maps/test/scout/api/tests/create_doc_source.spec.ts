/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';

apiTest.describe('Maps - doc source creation', { tag: [...tags.stateful.classic] }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    cookieHeader = (await samlAuth.asInteractiveUser('admin')).cookieHeader;
  });

  apiTest.afterAll(async ({ esClient }) => {
    await esClient.indices.delete({ index: 'testing123', ignore_unavailable: true });
  });

  apiTest(
    'should create a new index and pattern but not clobber an existing one',
    async ({ apiClient }) => {
      const response = await apiClient.post('internal/maps/docSource', {
        headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
        body: {
          index: 'testing123',
          mappings: { properties: { coordinates: { type: 'geo_point' } } },
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.success).toBe(true);

      const duplicateResponse = await apiClient.post('internal/maps/docSource', {
        headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
        body: {
          index: 'testing123',
          mappings: { properties: { coordinates: { type: 'geo_point' } } },
        },
      });

      expect(duplicateResponse).toHaveStatusCode(500);
    }
  );

  apiTest('should fail to create index and pattern with invalid index', async ({ apiClient }) => {
    const response = await apiClient.post('internal/maps/docSource', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      body: {
        index: '_testing456',
        mappings: { properties: { coordinates: { type: 'geo_point' } } },
      },
    });

    expect(response).toHaveStatusCode(500);
  });
});
