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
  DeleteTransformsRequestSchema,
  DeleteTransformsResponseSchema,
} from '../../../../common';
import { TRANSFORM_STATE } from '../../../../common/constants';
import { generateTransformConfig, generateDestIndex } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

const transformIds = ['bulk_delete_test_1', 'bulk_delete_test_2'];

apiTest.describe('bulk delete', { tag: tags.stateful.all }, () => {
  const destinationIndices = transformIds.map(generateDestIndex);
  let transformManagerCookieHeader: CookieHeader;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asTransformManager();
    transformManagerCookieHeader = credentials.cookieHeader;
  });

  apiTest.beforeEach(async ({ esClient, apiServices }) => {
    for (let i = 0; i < transformIds.length; i++) {
      const config = generateTransformConfig(transformIds[i]);
      await apiServices.transform.createTransform({ transform_id: transformIds[i], ...config });
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
        ...transformManagerCookieHeader,
      },
      body: reqBody,
      responseType: 'json',
    });
    const deleteResponse = body as DeleteTransformsResponseSchema;

    expect(statusCode).toBe(200);
    for (const id of transformIds) {
      expect(deleteResponse[id]).toBeDefined();
      expect(deleteResponse[id]!.transformDeleted.success).toBe(true);
      expect(deleteResponse[id]!.destIndexDeleted!.success).toBe(false);
      expect(deleteResponse[id]!.destDataViewDeleted!.success).toBe(false);
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
          ...transformManagerCookieHeader,
        },
        body: reqBody,
        responseType: 'json',
      });
      const deleteResponse = body as DeleteTransformsResponseSchema;

      expect(statusCode).toBe(200);
      for (const id of transformIds) {
        expect(deleteResponse[id].transformDeleted.success).toBe(true);
      }
      expect(deleteResponse[invalidTransformId].transformDeleted.success).toBe(false);
      expect(deleteResponse[invalidTransformId].transformDeleted.error).toBeDefined();
    }
  );
});
