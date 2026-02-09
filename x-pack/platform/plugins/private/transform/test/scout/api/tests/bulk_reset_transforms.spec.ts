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
  ResetTransformsRequestSchema,
  ResetTransformsResponseSchema,
} from '../../../../common';
import { TRANSFORM_STATE } from '../../../../common/constants';
import { generateTransformConfig } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

apiTest.describe('bulk reset', { tag: tags.ESS_ONLY }, () => {
  const transformIds = ['bulk_reset_test_1', 'bulk_reset_test_2'];
  let transformManagerCookieHeader: CookieHeader;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asTransformManager();
    transformManagerCookieHeader = credentials.cookieHeader;
  });

  apiTest.beforeEach(async ({ esClient, apiServices }) => {
    for (const id of transformIds) {
      const config = generateTransformConfig(id);
      await apiServices.transform.createTransform({ transform_id: id, ...config });
      await esClient.transform.startTransform({ transform_id: id });
    }

    for (const id of transformIds) {
      await esClient.transform.stopTransform({ transform_id: id, wait_for_completion: true });
    }
  });

  apiTest.afterEach(async ({ apiServices, esClient }) => {
    // Delete transforms explicitly before cleaning indices
    for (const id of transformIds) {
      try {
        await esClient.transform.deleteTransform({ transform_id: id, force: true });
      } catch {
        // Ignore if transform doesn't exist
      }
    }
    await apiServices.transform.cleanTransformIndices();
  });

  apiTest('should reset multiple transforms by transformIds', async ({ apiClient }) => {
    const reqBody: ResetTransformsRequestSchema = {
      transformsInfo: transformIds.map((id) => ({ id, state: TRANSFORM_STATE.STOPPED })),
    };
    const { statusCode, body } = await apiClient.post('internal/transform/reset_transforms', {
      headers: {
        ...COMMON_HEADERS,
        ...transformManagerCookieHeader,
      },
      body: reqBody,
      responseType: 'json',
    });
    const resetResponse = body as ResetTransformsResponseSchema;

    expect(statusCode).toBe(200);
    for (const id of transformIds) {
      expect(resetResponse[id].transformReset.success).toBe(true);
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
          ...transformManagerCookieHeader,
        },
        body: reqBody,
        responseType: 'json',
      });
      const resetResponse = body as ResetTransformsResponseSchema;

      expect(statusCode).toBe(200);
      for (const id of transformIds) {
        expect(resetResponse[id].transformReset.success).toBe(true);
      }
      expect(resetResponse[invalidTransformId].transformReset.success).toBe(false);
      expect(resetResponse[invalidTransformId].transformReset.error).toBeDefined();
    }
  );
});
