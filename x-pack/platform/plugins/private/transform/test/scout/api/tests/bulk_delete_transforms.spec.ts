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
import { COMMON_HEADERS } from '../constants';

const transformIds = ['bulk_delete_test_1', 'bulk_delete_test_2'];

apiTest.describe('bulk delete', { tag: tags.ESS_ONLY }, () => {
  let transformPowerUserApiCredentials: RoleApiCredentials;
  const destinationIndices = transformIds.map(generateDestIndex);

  apiTest.beforeAll(async ({ requestAuth }) => {
    transformPowerUserApiCredentials = await requestAuth.loginAsTransformPowerUser();
  });

  apiTest.beforeEach(async ({ esClient, apiServices }) => {
    for (let i = 0; i < transformIds.length; i++) {
      const config = generateTransformConfig(transformIds[i]);
      await apiServices.transform.createTransform(transformIds[i], config);
      await esClient.indices.create({ index: destinationIndices[i] });
    }
  });

  apiTest.afterEach(async ({ esClient }) => {
    for (const index of destinationIndices) {
      await esClient.indices.delete({ index, ignore_unavailable: true });
    }
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.transform.cleanTransformIndices();
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
