/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { CookieHeader } from '@kbn/scout';
import type {
  StartTransformsRequestSchema,
  StartTransformsResponseSchema,
} from '../../../../common';
import { generateTransformConfig } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

apiTest.describe('/internal/transform/start_transforms', { tag: tags.stateful.all }, () => {
  const transformIds = ['bulk_start_test_1', 'bulk_start_test_2'];
  let transformManagerCookieHeader: CookieHeader;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asTransformManager();
    transformManagerCookieHeader = credentials.cookieHeader;
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    for (const id of transformIds) {
      const config = generateTransformConfig(id);
      await apiServices.transform.createTransform({ transform_id: id, ...config });
    }
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.transform.cleanTransformIndices();
  });

  apiTest('should start multiple transforms by transformIds', async ({ apiClient }) => {
    const reqBody: StartTransformsRequestSchema = transformIds.map((id) => ({ id }));
    const { statusCode, body } = await apiClient.post('internal/transform/start_transforms', {
      headers: {
        ...COMMON_HEADERS,
        ...transformManagerCookieHeader,
      },
      body: reqBody,
      responseType: 'json',
    });
    const startResponse = body as StartTransformsResponseSchema;

    expect(statusCode).toBe(200);

    for (const id of transformIds) {
      expect(startResponse[id].success).toBe(true);
    }
  });

  apiTest(
    'should start multiple transforms by transformIds, even if one of the transformIds is invalid',
    async ({ apiClient }) => {
      const invalidTransformId = 'invalid_transform_id';
      const reqBody: StartTransformsRequestSchema = [
        { id: transformIds[0] },
        { id: invalidTransformId },
        { id: transformIds[1] },
      ];
      const { statusCode, body } = await apiClient.post('internal/transform/start_transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...transformManagerCookieHeader,
        },
        body: reqBody,
        responseType: 'json',
      });
      const startResponse = body as StartTransformsResponseSchema;

      expect(statusCode).toBe(200);

      for (const id of transformIds) {
        expect(startResponse[id].success).toBe(true);
      }

      expect(startResponse[invalidTransformId].success).toBe(false);
      expect(startResponse[invalidTransformId].error).toBeDefined();
    }
  );
});
