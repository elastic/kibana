/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import type { DeleteTransformsRequestSchema } from '../../../../server/routes/api_schemas/delete_transforms';
import { TRANSFORM_STATE } from '../../../../common/constants';
import { generateTransformConfig, generateDestIndex } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from './constants';

apiTest.describe('/internal/transform/delete_transforms', { tag: tags.ESS_ONLY }, () => {
  let transformPowerUserApiCredentials: RoleApiCredentials;
  let transformViewerUserApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    transformPowerUserApiCredentials = await requestAuth.loginAsTransformPowerUser();
    transformViewerUserApiCredentials = await requestAuth.loginAsTransformViewerUser();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.transform.cleanTransformIndices();
  });

  apiTest.describe('single transform deletion', () => {
    const transformId = 'transform-test-delete';
    const destinationIndex = generateDestIndex(transformId);

    apiTest.beforeEach(async ({ esClient, apiServices }) => {
      const config = generateTransformConfig(transformId);
      await apiServices.transform.createTransform(transformId, config);
      await esClient.indices.create({ index: destinationIndex });
    });

    apiTest.afterEach(async ({ esClient }) => {
      try {
        await esClient.indices.delete({ index: destinationIndex });
      } catch {}
    });

    apiTest('should delete transform by transformId', async ({ apiClient }) => {
      const reqBody: DeleteTransformsRequestSchema = {
        transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
      };
      const { statusCode, body } = await apiClient.post('internal/transform/delete_transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...transformPowerUserApiCredentials.apiKeyHeader,
        },
        body: reqBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body[transformId].transformDeleted.success).toBe(true);
      expect(body[transformId].destIndexDeleted.success).toBe(false);
      expect(body[transformId].destDataViewDeleted.success).toBe(false);
    });

    apiTest('should return 403 for unauthorized user', async ({ apiClient }) => {
      const reqBody: DeleteTransformsRequestSchema = {
        transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
      };
      const { statusCode } = await apiClient.post('internal/transform/delete_transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...transformViewerUserApiCredentials.apiKeyHeader,
        },
        body: reqBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(403);
    });
  });

  apiTest.describe('single transform deletion with invalid transformId', () => {
    apiTest(
      'should return 200 with error in response if invalid transformId',
      async ({ apiClient }) => {
        const reqBody: DeleteTransformsRequestSchema = {
          transformsInfo: [{ id: 'invalid_transform_id', state: TRANSFORM_STATE.STOPPED }],
        };
        const { statusCode, body } = await apiClient.post('internal/transform/delete_transforms', {
          headers: {
            ...COMMON_HEADERS,
            ...transformPowerUserApiCredentials.apiKeyHeader,
          },
          body: reqBody,
          responseType: 'json',
        });

        expect(statusCode).toBe(200);
        expect(body.invalid_transform_id.transformDeleted.success).toBe(false);
        expect(body.invalid_transform_id.transformDeleted.error).toBeDefined();
      }
    );
  });

  apiTest.describe('bulk deletion', () => {
    const transformIds = ['bulk_delete_test_1', 'bulk_delete_test_2'];
    const destinationIndices = transformIds.map(generateDestIndex);

    apiTest.beforeEach(async ({ esClient, apiServices }) => {
      for (let i = 0; i < transformIds.length; i++) {
        const config = generateTransformConfig(transformIds[i]);
        await apiServices.transform.createTransform(transformIds[i], config);
        await esClient.indices.create({ index: destinationIndices[i] });
      }
    });

    apiTest.afterEach(async ({ esClient }) => {
      for (const index of destinationIndices) {
        try {
          await esClient.indices.delete({ index });
        } catch (error) {
          throw new Error(
            `Failed to delete destination index ${index} in afterEach hook: ${error}`
          );
        }
      }
    });

    apiTest('should delete multiple transforms by transformIds', async ({ apiClient }) => {
      const reqBody: DeleteTransformsRequestSchema = {
        transformsInfo: transformIds.map((id) => ({ id, state: TRANSFORM_STATE.STOPPED })),
      };
      const { statusCode, body } = await apiClient.post('internal/transform/delete_transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...transformPowerUserApiCredentials.apiKeyHeader,
        },
        body: reqBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      for (const id of transformIds) {
        expect(body[id].transformDeleted.success).toBe(true);
        expect(body[id].destIndexDeleted.success).toBe(false);
        expect(body[id].destDataViewDeleted.success).toBe(false);
      }
    });

    apiTest(
      'should delete multiple transforms by transformIds, even if one of the transformIds is invalid',
      async ({ apiClient }) => {
        const invalidTransformId = 'invalid_transform_id';
        const reqBody: DeleteTransformsRequestSchema = {
          transformsInfo: [
            ...transformIds.map((id) => ({ id, state: TRANSFORM_STATE.STOPPED })),
            { id: invalidTransformId, state: TRANSFORM_STATE.STOPPED },
          ],
        };
        const { statusCode, body } = await apiClient.post('internal/transform/delete_transforms', {
          headers: {
            ...COMMON_HEADERS,
            ...transformPowerUserApiCredentials.apiKeyHeader,
          },
          body: reqBody,
          responseType: 'json',
        });

        expect(statusCode).toBe(200);
        for (const id of transformIds) {
          expect(body[id].transformDeleted.success).toBe(true);
        }
        expect(body[invalidTransformId].transformDeleted.success).toBe(false);
        expect(body[invalidTransformId].transformDeleted.error).toBeDefined();
      }
    );
  });

  apiTest.describe('with deleteDestIndex setting', () => {
    const transformId = 'test2';
    const destinationIndex = generateDestIndex(transformId);

    apiTest.beforeAll(async ({ esClient, apiServices }) => {
      const config = generateTransformConfig(transformId);
      await apiServices.transform.createTransform(transformId, config);
      await esClient.indices.create({ index: destinationIndex });
    });

    apiTest.afterAll(async ({ esClient }) => {
      try {
        await esClient.indices.delete({ index: destinationIndex });
      } catch (error) {
        throw new Error(`Failed to delete destination index in afterAll hook: ${error}`);
      }
    });

    apiTest('should delete transform and destination index', async ({ apiClient }) => {
      const reqBody: DeleteTransformsRequestSchema = {
        transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
        deleteDestIndex: true,
      };
      const { statusCode, body } = await apiClient.post('internal/transform/delete_transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...transformPowerUserApiCredentials.apiKeyHeader,
        },
        body: reqBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body[transformId].transformDeleted.success).toBe(true);
      expect(body[transformId].destIndexDeleted.success).toBe(true);
      expect(body[transformId].destDataViewDeleted.success).toBe(false);
    });
  });
});
