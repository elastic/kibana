/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type {
  StartTransformsRequestSchema,
  StartTransformsResponseSchema,
} from '../../../../common';
import { generateTransformConfig } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

apiTest.describe('/internal/transform/start_transforms', { tag: tags.stateful.all }, () => {
  const transformId = 'transform-test-start';

  apiTest.beforeEach(async ({ apiServices }) => {
    const config = generateTransformConfig(transformId);
    await apiServices.transform.createTransform({ transform_id: transformId, ...config });
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.transform.cleanTransformIndices();
  });

  apiTest('should start the transform by transformId', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asTransformManager();

    const reqBody: StartTransformsRequestSchema = [{ id: transformId }];
    const { statusCode, body } = await apiClient.post('internal/transform/start_transforms', {
      headers: {
        ...COMMON_HEADERS,
        ...cookieHeader,
      },
      body: reqBody,
      responseType: 'json',
    });
    const startResponse = body as StartTransformsResponseSchema;

    expect(statusCode).toBe(200);

    expect(startResponse[transformId].success).toBe(true);
    expect(startResponse[transformId].error).toBeUndefined();
  });

  apiTest(
    'should return 200 with success:false for unauthorized user',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformViewer();

      const reqBody: StartTransformsRequestSchema = [{ id: transformId }];
      const { statusCode, body } = await apiClient.post('internal/transform/start_transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
        },
        body: reqBody,
        responseType: 'json',
      });
      const startResponse = body as StartTransformsResponseSchema;

      expect(statusCode).toBe(200);

      expect(startResponse[transformId].success).toBe(false);
      expect(typeof startResponse[transformId].error).toBe('object');
    }
  );

  // single transform start with invalid transformId
  apiTest(
    'should return 200 with error in response if invalid transformId',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformManager();

      const reqBody: StartTransformsRequestSchema = [{ id: 'invalid_transform_id' }];
      const { statusCode, body } = await apiClient.post('internal/transform/start_transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
        },
        body: reqBody,
        responseType: 'json',
      });
      const startResponse = body as StartTransformsResponseSchema;

      expect(statusCode).toBe(200);

      expect(startResponse.invalid_transform_id.success).toBe(false);
      expect(startResponse.invalid_transform_id.error).toBeDefined();
    }
  );
});
