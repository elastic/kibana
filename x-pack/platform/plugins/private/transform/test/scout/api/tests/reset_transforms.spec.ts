/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import type { ResetTransformsRequestSchema } from '../../../../server/routes/api_schemas/reset_transforms';
import { TRANSFORM_STATE } from '../../../../common/constants';
import { generateTransformConfig } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from './constants';

apiTest.describe('/internal/transform/reset_transforms', { tag: tags.ESS_ONLY }, () => {
  let transformPowerUserApiCredentials: RoleApiCredentials;
  let transformViewerUserApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    transformPowerUserApiCredentials = await requestAuth.loginAsTransformPowerUser();
    transformViewerUserApiCredentials = await requestAuth.loginAsTransformViewerUser();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.transform.cleanTransformIndices();
  });

  apiTest.describe('single transform reset', () => {
    const transformId = 'transform-test-reset';

    apiTest.beforeEach(async ({ esClient, apiServices }) => {
      const config = generateTransformConfig(transformId);
      await apiServices.transform.createTransform(transformId, config);
      await esClient.transform.startTransform({ transform_id: transformId });
      // Wait a bit for transform to process some data
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await esClient.transform.stopTransform({
        transform_id: transformId,
        wait_for_completion: true,
      });
    });

    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.transform.cleanTransformIndices();
    });

    apiTest('should reset transform by transformId', async ({ apiClient }) => {
      const reqBody: ResetTransformsRequestSchema = {
        transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
      };
      const { statusCode, body } = await apiClient.post('internal/transform/reset_transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...transformPowerUserApiCredentials.apiKeyHeader,
        },
        body: reqBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body[transformId].transformReset.success).toBe(true);
    });

    apiTest('should return 403 for unauthorized user', async ({ apiClient }) => {
      const reqBody: ResetTransformsRequestSchema = {
        transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
      };
      const { statusCode } = await apiClient.post('internal/transform/reset_transforms', {
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

  apiTest.describe('single transform reset with invalid transformId', () => {
    apiTest(
      'should return 200 with error in response if invalid transformId',
      async ({ apiClient }) => {
        const reqBody: ResetTransformsRequestSchema = {
          transformsInfo: [{ id: 'invalid_transform_id', state: TRANSFORM_STATE.STOPPED }],
        };
        const { statusCode, body } = await apiClient.post('internal/transform/reset_transforms', {
          headers: {
            ...COMMON_HEADERS,
            ...transformPowerUserApiCredentials.apiKeyHeader,
          },
          body: reqBody,
          responseType: 'json',
        });

        expect(statusCode).toBe(200);
        expect(body.invalid_transform_id.transformReset.success).toBe(false);
        expect(body.invalid_transform_id.transformReset.error).toBeDefined();
      }
    );
  });

  apiTest.describe('bulk reset', () => {
    const transformIds = ['bulk_reset_test_1', 'bulk_reset_test_2'];

    apiTest.beforeEach(async ({ esClient, apiServices }) => {
      for (const id of transformIds) {
        const config = generateTransformConfig(id);
        await apiServices.transform.createTransform(id, config);
        await esClient.transform.startTransform({ transform_id: id });
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
      for (const id of transformIds) {
        await esClient.transform.stopTransform({ transform_id: id, wait_for_completion: true });
      }
    });

    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.transform.cleanTransformIndices();
    });

    apiTest('should reset multiple transforms by transformIds', async ({ apiClient }) => {
      const reqBody: ResetTransformsRequestSchema = {
        transformsInfo: transformIds.map((id) => ({ id, state: TRANSFORM_STATE.STOPPED })),
      };
      const { statusCode, body } = await apiClient.post('internal/transform/reset_transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...transformPowerUserApiCredentials.apiKeyHeader,
        },
        body: reqBody,
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      for (const id of transformIds) {
        expect(body[id].transformReset.success).toBe(true);
      }
    });

    apiTest(
      'should reset multiple transforms by transformIds, even if one of the transformIds is invalid',
      async ({ apiClient }) => {
        const invalidTransformId = 'invalid_transform_id';
        const reqBody: ResetTransformsRequestSchema = {
          transformsInfo: [
            ...transformIds.map((id) => ({ id, state: TRANSFORM_STATE.STOPPED })),
            { id: invalidTransformId, state: TRANSFORM_STATE.STOPPED },
          ],
        };
        const { statusCode, body } = await apiClient.post('internal/transform/reset_transforms', {
          headers: {
            ...COMMON_HEADERS,
            ...transformPowerUserApiCredentials.apiKeyHeader,
          },
          body: reqBody,
          responseType: 'json',
        });

        expect(statusCode).toBe(200);
        for (const id of transformIds) {
          expect(body[id].transformReset.success).toBe(true);
        }
        expect(body[invalidTransformId].transformReset.success).toBe(false);
        expect(body[invalidTransformId].transformReset.error).toBeDefined();
      }
    );
  });
});
