/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';

apiTest.describe('Maps - get matching index patterns', { tag: [...tags.stateful.classic] }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, esArchiver, kbnClient }) => {
    cookieHeader = (await samlAuth.asInteractiveUser('admin')).cookieHeader;
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.logstashFunctional);
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.mapsData);
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.maps);
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(testData.KBN_ARCHIVES.maps);
  });

  apiTest('should return an array containing indexes matching pattern', async ({ apiClient }) => {
    const response = await apiClient.get(
      'internal/maps/getMatchingIndexes?indexPattern=geo_shapes',
      {
        headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.success).toBe(true);
    expect(response.body.matchingIndexes).toHaveLength(1);
  });

  apiTest('should return an empty array when no indexes match pattern', async ({ apiClient }) => {
    const response = await apiClient.get(
      'internal/maps/getMatchingIndexes?indexPattern=notAnIndex',
      {
        headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.success).toBe(true);
    expect(response.body.matchingIndexes).toHaveLength(0);
  });
});
