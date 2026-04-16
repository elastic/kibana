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

  apiTest.beforeAll(async ({ samlAuth, esArchiver, kbnClient }) => {
    cookieHeader = (await samlAuth.asInteractiveUser('admin')).cookieHeader;
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.logstashFunctional);
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.maps);
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.mapsData);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(testData.KBN_ARCHIVES.maps);
  });

  apiTest('should delete a valid feature document', async ({ apiClient }) => {
    const response = await apiClient.delete('internal/maps/feature/999', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      body: { index: 'drawing_data' },
    });

    expect(response).toHaveStatusCode(200);
  });

  apiTest('previously deleted document no longer exists in index', async ({ apiClient }) => {
    const response = await apiClient.delete('internal/maps/feature/999', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      body: { index: 'drawing_data' },
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('should fail if not a valid document', async ({ apiClient }) => {
    const response = await apiClient.delete('internal/maps/feature/998', {
      headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      body: { index: 'drawing_data' },
    });

    expect(response).toHaveStatusCode(404);
  });
});
