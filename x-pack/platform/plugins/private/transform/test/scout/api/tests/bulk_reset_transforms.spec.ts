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

apiTest.describe('bulk reset', { tag: tags.ESS_ONLY }, () => {
  const transformIds = ['bulk_reset_test_1', 'bulk_reset_test_2'];

  let transformPowerUserApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    transformPowerUserApiCredentials = await requestAuth.loginAsTransformPowerUser();
  });

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
