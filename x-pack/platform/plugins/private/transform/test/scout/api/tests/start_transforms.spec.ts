/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import type { StartTransformsRequestSchema } from '../../../../server/routes/api_schemas/start_transforms';
import { generateTransformConfig } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

apiTest.describe('/internal/transform/start_transforms', { tag: tags.ESS_ONLY }, () => {
  let transformPowerUserApiCredentials: RoleApiCredentials;
  let transformViewerUserApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    transformPowerUserApiCredentials = await requestAuth.loginAsTransformPowerUser();
    transformViewerUserApiCredentials = await requestAuth.loginAsTransformViewerUser();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.transform.cleanTransformIndices();
  });

  apiTest.describe('single transform start', () => {
    const transformId = 'transform-test-start';

    apiTest.beforeEach(async ({ apiServices }) => {
      const config = generateTransformConfig(transformId);
      await apiServices.transform.createTransform(transformId, config);
    });

    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.transform.cleanTransformIndices();
    });

    apiTest('should start the transform by transformId', async ({ apiClient }) => {
      const reqBody: StartTransformsRequestSchema = [{ id: transformId }];
      const { statusCode, body } = await apiClient.post('internal/transform/start_transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...transformPowerUserApiCredentials.apiKeyHeader,
        },
        body: reqBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);

      expect(body[transformId].success).toBe(true);
      expect(body[transformId].error).toBeUndefined();
    });

    apiTest('should return 200 with success:false for unauthorized user', async ({ apiClient }) => {
      const reqBody: StartTransformsRequestSchema = [{ id: transformId }];
      const { statusCode, body } = await apiClient.post('internal/transform/start_transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...transformViewerUserApiCredentials.apiKeyHeader,
        },
        body: reqBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);

      expect(body[transformId].success).toBe(false);
      expect(typeof body[transformId].error).toBe('object');
    });
  });

  apiTest.describe('single transform start with invalid transformId', () => {
    apiTest(
      'should return 200 with error in response if invalid transformId',
      async ({ apiClient }) => {
        const reqBody: StartTransformsRequestSchema = [{ id: 'invalid_transform_id' }];
        const { statusCode, body } = await apiClient.post('internal/transform/start_transforms', {
          headers: {
            ...COMMON_HEADERS,
            ...transformPowerUserApiCredentials.apiKeyHeader,
          },
          body: reqBody,
          responseType: 'json',
        });

        expect(statusCode).toBe(200);

        expect(body.invalid_transform_id.success).toBe(false);
        expect(body.invalid_transform_id.error).toBeDefined();
      }
    );
  });

  apiTest.describe('bulk start', () => {
    const transformIds = ['bulk_start_test_1', 'bulk_start_test_2'];

    apiTest.beforeEach(async ({ apiServices }) => {
      for (const id of transformIds) {
        const config = generateTransformConfig(id);
        await apiServices.transform.createTransform(id, config);
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
          ...transformPowerUserApiCredentials.apiKeyHeader,
        },
        body: reqBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);

      for (const id of transformIds) {
        expect(body[id].success).toBe(true);
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
            ...transformPowerUserApiCredentials.apiKeyHeader,
          },
          body: reqBody,
          responseType: 'json',
        });

        expect(statusCode).toBe(200);

        for (const id of transformIds) {
          expect(body[id].success).toBe(true);
        }

        expect(body[invalidTransformId].success).toBe(false);
        expect(body[invalidTransformId].error).toBeDefined();
      }
    );
  });
});
