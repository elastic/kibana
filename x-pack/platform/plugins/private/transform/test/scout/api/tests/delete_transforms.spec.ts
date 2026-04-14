/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type {
  DeleteTransformsRequestSchema,
  DeleteTransformsResponseSchema,
} from '../../../../common';
import { TRANSFORM_STATE } from '../../../../common/constants';
import { generateTransformConfig, generateDestIndex } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

apiTest.describe('/internal/transform/delete_transforms', { tag: tags.stateful.all }, () => {
  const transformId = 'transform-test-delete';
  const transformId2 = 'test2';
  const destinationIndex2 = generateDestIndex(transformId2);

  apiTest.beforeAll(async ({ esClient }) => {
    await esClient.indices.create({ index: destinationIndex2 });
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    const config = generateTransformConfig(transformId);
    await apiServices.transform.createTransform({ transform_id: transformId, ...config });
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.transform.cleanTransformIndices();
  });

  apiTest.afterAll(async ({ apiServices, esClient }) => {
    await esClient.indices.delete({ index: destinationIndex2, ignore_unavailable: true });

    await apiServices.transform.cleanTransformIndices();
  });

  apiTest('should delete transform by transformId', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asTransformManager();

    const reqBody: DeleteTransformsRequestSchema = {
      transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
    };
    const { statusCode, body } = await apiClient.post('internal/transform/delete_transforms', {
      headers: {
        ...COMMON_HEADERS,
        ...cookieHeader,
      },
      body: reqBody,
      responseType: 'json',
    });
    const deleteResponse = body as DeleteTransformsResponseSchema;

    expect(statusCode).toBe(200);
    expect(deleteResponse[transformId]).toBeDefined();
    expect(deleteResponse[transformId]!.transformDeleted.success).toBe(true);
    expect(deleteResponse[transformId]!.destIndexDeleted!.success).toBe(false);
    expect(deleteResponse[transformId]!.destDataViewDeleted!.success).toBe(false);
  });

  apiTest('should return 403 for unauthorized user', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asTransformViewer();

    const reqBody: DeleteTransformsRequestSchema = {
      transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
    };
    const { statusCode } = await apiClient.post('internal/transform/delete_transforms', {
      headers: {
        ...COMMON_HEADERS,
        ...cookieHeader,
      },
      body: reqBody,
      responseType: 'json',
    });

    expect(statusCode).toBe(403);
  });

  apiTest(
    'should return 200 with error in response if invalid transformId',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformManager();

      const reqBody: DeleteTransformsRequestSchema = {
        transformsInfo: [{ id: 'invalid_transform_id', state: TRANSFORM_STATE.STOPPED }],
      };
      const { statusCode, body } = await apiClient.post('internal/transform/delete_transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
        },
        body: reqBody,
        responseType: 'json',
      });
      const deleteResponse = body as DeleteTransformsResponseSchema;

      expect(statusCode).toBe(200);
      expect(deleteResponse.invalid_transform_id.transformDeleted.success).toBe(false);
      expect(deleteResponse.invalid_transform_id.transformDeleted.error).toBeDefined();
    }
  );

  apiTest(
    'should delete transform and destination index with deleteDestIndex setting',
    async ({ apiClient, apiServices, esClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformManager();

      const config = generateTransformConfig(transformId2);
      await apiServices.transform.createTransform({ transform_id: transformId2, ...config });

      const reqBody: DeleteTransformsRequestSchema = {
        transformsInfo: [{ id: transformId2, state: TRANSFORM_STATE.STOPPED }],
        deleteDestIndex: true,
      };
      const { statusCode, body } = await apiClient.post('internal/transform/delete_transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
        },
        body: reqBody,
        responseType: 'json',
      });
      const deleteResponse = body as DeleteTransformsResponseSchema;

      expect(statusCode).toBe(200);
      expect(deleteResponse[transformId2]).toBeDefined();
      expect(deleteResponse[transformId2]!.transformDeleted.success).toBe(true);
      expect(deleteResponse[transformId2]!.destIndexDeleted!.success).toBe(true);
      expect(deleteResponse[transformId2]!.destDataViewDeleted!.success).toBe(false);

      // Ensure destination index is deleted
      const destinationIndexExists = await esClient.indices.exists({ index: destinationIndex2 });
      expect(destinationIndexExists).toBe(false);
    }
  );
});
