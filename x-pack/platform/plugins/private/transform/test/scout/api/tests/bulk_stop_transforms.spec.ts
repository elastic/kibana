/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { CookieHeader } from '@kbn/scout';
import type { estypes } from '@elastic/elasticsearch';
import type { StopTransformsRequestSchema, StopTransformsResponseSchema } from '../../../../common';
import { TRANSFORM_STATE } from '../../../../common/constants';
import { generateTransformConfig } from '../helpers/transform_config';

import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

const transformIds = ['bulk_stop_test_1', 'bulk_stop_test_2'];

apiTest.describe('/internal/transform/stop_transforms', { tag: tags.stateful.all }, () => {
  let transformManagerCookieHeader: CookieHeader;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asTransformManager();
    transformManagerCookieHeader = credentials.cookieHeader;
  });
  apiTest.beforeEach(async ({ esClient, apiServices }) => {
    for (const id of transformIds) {
      const config: estypes.TransformPutTransformRequest = {
        ...generateTransformConfig(id),
        transform_id: id,
        settings: {
          docs_per_second: 10,
          max_page_search_size: 10,
        },
        sync: {
          time: { field: '@timestamp' },
        },
      };
      await apiServices.transform.createTransform(config);
      await esClient.transform.startTransform({ transform_id: id });
    }
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.transform.cleanTransformIndices();
  });

  apiTest('should stop multiple transforms by transformIds', async ({ apiClient }) => {
    const reqBody: StopTransformsRequestSchema = transformIds.map((id) => ({
      id,
      state: TRANSFORM_STATE.STARTED,
    }));
    const { statusCode, body } = await apiClient.post('internal/transform/stop_transforms', {
      headers: {
        ...COMMON_HEADERS,
        ...transformManagerCookieHeader,
      },
      body: reqBody,
      responseType: 'json',
    });
    const stopResponse = body as StopTransformsResponseSchema;

    expect(statusCode).toBe(200);

    for (const id of transformIds) {
      expect(stopResponse[id].success).toBe(true);
    }
  });

  apiTest(
    'should stop multiple transforms by transformIds, even if one of the transformIds is invalid',
    async ({ apiClient }) => {
      const invalidTransformId = 'invalid_transform_id';
      const reqBody: StopTransformsRequestSchema = [
        { id: transformIds[0], state: TRANSFORM_STATE.STARTED },
        { id: invalidTransformId, state: TRANSFORM_STATE.STOPPED },
        { id: transformIds[1], state: TRANSFORM_STATE.STARTED },
      ];
      const { statusCode, body } = await apiClient.post('internal/transform/stop_transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...transformManagerCookieHeader,
        },
        body: reqBody,
        responseType: 'json',
      });
      const stopResponse = body as StopTransformsResponseSchema;

      expect(statusCode).toBe(200);

      for (const id of transformIds) {
        expect(stopResponse[id].success).toBe(true);
      }

      expect(stopResponse[invalidTransformId].success).toBe(false);
      expect(stopResponse[invalidTransformId].error).toBeDefined();
    }
  );
});
