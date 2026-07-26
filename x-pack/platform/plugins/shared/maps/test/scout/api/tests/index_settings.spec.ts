/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';

apiTest.describe('Maps - index settings', { tag: [...tags.stateful.classic] }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, esArchiver }) => {
    cookieHeader = (await samlAuth.asInteractiveUser('viewer')).cookieHeader;
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.logstashFunctional);
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.mapsData);
  });

  apiTest(
    'should return default index settings when max_result_window and max_inner_result_window are not set',
    async ({ apiClient }) => {
      const response = await apiClient.get(
        'internal/maps/indexSettings?indexPatternTitle=logstash*',
        {
          headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.maxResultWindow).toBe(10000);
      expect(response.body.maxInnerResultWindow).toBe(100);
    }
  );

  apiTest('should return index settings', async ({ apiClient }) => {
    const response = await apiClient.get(
      'internal/maps/indexSettings?indexPatternTitle=geo_shape*',
      {
        headers: { ...testData.INTERNAL_HEADERS, ...cookieHeader },
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.maxResultWindow).toBe(10001);
    expect(response.body.maxInnerResultWindow).toBe(101);
  });
});
