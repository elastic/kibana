/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';

apiTest.describe('Maps - doc feature deletion', { tag: [...tags.stateful.classic] }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, esArchiver }) => {
    cookieHeader = (await samlAuth.asInteractiveUser('admin')).cookieHeader;
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.mapsData);
  });

  apiTest(
    'should delete a feature document and verify it is gone',
    async ({ apiClient, esClient }) => {
      // pre-create document for local retry runs, Scout only supports `esArchiver.loadIfNeeded` and won't re-index missing docs
      await esClient.index({
        index: 'drawing_data',
        id: '999',
        document: { geometry: { type: 'Point', coordinates: [0, 0] } },
        refresh: true,
      });

      const deleteResponse = await apiClient.delete('internal/maps/feature/999', {
        headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
        body: { index: 'drawing_data' },
      });
      expect(deleteResponse).toHaveStatusCode(200);

      const retryResponse = await apiClient.delete('internal/maps/feature/999', {
        headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
        body: { index: 'drawing_data' },
      });
      expect(retryResponse).toHaveStatusCode(404);
    }
  );

  apiTest('should fail if not a valid document', async ({ apiClient }) => {
    const response = await apiClient.delete('internal/maps/feature/998', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      body: { index: 'drawing_data' },
    });

    expect(response).toHaveStatusCode(404);
  });
});
