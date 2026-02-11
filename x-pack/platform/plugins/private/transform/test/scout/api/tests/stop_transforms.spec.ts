/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { StopTransformsRequestSchema, StopTransformsResponseSchema } from '../../../../common';
import { TRANSFORM_STATE } from '../../../../common/constants';
import { generateTransformConfig } from '../helpers/transform_config';

import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

const transformId = 'transform-test-stop';

apiTest.describe('/internal/transform/stop_transforms', { tag: tags.ESS_ONLY }, () => {
  apiTest.beforeEach(async ({ esClient, apiServices }) => {
    // to test stopping transforms we create a slow continuous transform so it doesn't stop automatically
    const config = {
      ...generateTransformConfig(transformId),
      settings: {
        docs_per_second: 10,
        max_page_search_size: 10,
      },
      sync: {
        time: { field: '@timestamp' },
      },
    };
    await apiServices.transform.createTransform({ transform_id: transformId, ...config });
    await esClient.transform.startTransform({ transform_id: transformId });
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.transform.cleanTransformIndices();
  });

  apiTest('should stop the transform by transformId', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asTransformManager();

    const reqBody: StopTransformsRequestSchema = [
      { id: transformId, state: TRANSFORM_STATE.STARTED },
    ];
    const { statusCode, body } = await apiClient.post('internal/transform/stop_transforms', {
      headers: {
        ...COMMON_HEADERS,
        ...cookieHeader,
      },
      body: reqBody,
      responseType: 'json',
    });
    const stopResponse = body as StopTransformsResponseSchema;

    expect(statusCode).toBe(200);

    expect(stopResponse[transformId].success).toBe(true);
    expect(stopResponse[transformId].error).toBeUndefined();
  });

  apiTest(
    'should return 200 with success:false for unauthorized user',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformViewer();

      const reqBody: StopTransformsRequestSchema = [
        { id: transformId, state: TRANSFORM_STATE.STARTED },
      ];
      const { statusCode, body } = await apiClient.post('internal/transform/stop_transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
        },
        body: reqBody,
        responseType: 'json',
      });
      const stopResponse = body as StopTransformsResponseSchema;

      expect(statusCode).toBe(200);

      expect(stopResponse[transformId].success).toBe(false);
      expect(typeof stopResponse[transformId].error).toBe('object');
    }
  );
});
