/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import type { StopTransformsRequestSchema } from '../../../../server/routes/api_schemas/stop_transforms';
import { TRANSFORM_STATE } from '../../../../common/constants';
import { generateTransformConfig } from '../helpers/transform_config';

import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from './constants';

const transformId = 'transform-test-stop';

apiTest.describe('/internal/transform/stop_transforms', { tag: tags.ESS_ONLY }, () => {
  let transformPowerUserApiCredentials: RoleApiCredentials;
  let transformViewerUserApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    transformPowerUserApiCredentials = await requestAuth.loginAsTransformPowerUser();
    transformViewerUserApiCredentials = await requestAuth.loginAsTransformViewerUser();
  });

  apiTest.beforeEach(async ({ esClient, apiServices }) => {
    // to test stopping transforms we create a slow continuous transform so it doesn't stop automatically
    const config = {
      ...generateTransformConfig(transformId),
      settings: {
        docs_per_second: 10,
        max_page_search_size: 10,
      },
      sync: {
        time: { field: '@timestamp' },
      },
    };
    await apiServices.transform.createTransform(transformId, config);
    await esClient.transform.startTransform({ transform_id: transformId });
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.transform.cleanTransformIndices();
  });

  apiTest('should stop the transform by transformId', async ({ apiClient }) => {
    const reqBody: StopTransformsRequestSchema = [
      { id: transformId, state: TRANSFORM_STATE.STARTED },
    ];
    const { statusCode, body } = await apiClient.post('internal/transform/stop_transforms', {
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
    const reqBody: StopTransformsRequestSchema = [
      { id: transformId, state: TRANSFORM_STATE.STARTED },
    ];
    const { statusCode, body } = await apiClient.post('internal/transform/stop_transforms', {
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
