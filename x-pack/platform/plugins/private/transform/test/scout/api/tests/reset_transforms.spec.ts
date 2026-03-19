/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type {
  ResetTransformsRequestSchema,
  ResetTransformsResponseSchema,
} from '../../../../common';
import { TRANSFORM_STATE } from '../../../../common/constants';
import { generateTransformConfig } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

// single transform reset
apiTest.describe('/internal/transform/reset_transforms', { tag: tags.stateful.all }, () => {
  const transformId = 'transform-test-reset';

  apiTest.beforeEach(async ({ esClient, apiServices }) => {
    const config = generateTransformConfig(transformId);
    await apiServices.transform.createTransform({ transform_id: transformId, ...config });
    await esClient.transform.startTransform({ transform_id: transformId });

    await esClient.transform.stopTransform({
      transform_id: transformId,
      wait_for_completion: true,
    });
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.transform.cleanTransformIndices();
  });

  apiTest('should reset transform by transformId', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asTransformManager();

    // Check that batch transform finished running and assert stats.
    const reqBody: ResetTransformsRequestSchema = {
      transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
    };
    const { statusCode, body } = await apiClient.post('internal/transform/reset_transforms', {
      headers: {
        ...COMMON_HEADERS,
        ...cookieHeader,
      },
      body: reqBody,
      responseType: 'json',
    });
    const resetResponse = body as ResetTransformsResponseSchema;

    expect(statusCode).toBe(200);
    expect(resetResponse[transformId].transformReset.success).toBe(true);
  });

  apiTest('should return 403 for unauthorized user', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asTransformViewer();

    // Check that batch transform finished running and assert stats.
    const reqBody: ResetTransformsRequestSchema = {
      transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
    };
    const { statusCode } = await apiClient.post('internal/transform/reset_transforms', {
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

      const reqBody: ResetTransformsRequestSchema = {
        transformsInfo: [{ id: 'invalid_transform_id', state: TRANSFORM_STATE.STOPPED }],
      };
      const { statusCode, body } = await apiClient.post('internal/transform/reset_transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
        },
        body: reqBody,
        responseType: 'json',
      });
      const resetResponse = body as ResetTransformsResponseSchema;

      expect(statusCode).toBe(200);
      expect(resetResponse.invalid_transform_id.transformReset.success).toBe(false);
      expect(resetResponse.invalid_transform_id.transformReset.error).toBeDefined();
    }
  );
});
