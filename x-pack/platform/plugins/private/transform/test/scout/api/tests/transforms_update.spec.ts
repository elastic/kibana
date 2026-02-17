/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type {
  GetTransformsResponseSchema,
  PostTransformsUpdateResponseSchema,
} from '../../../../common';
import { generateTransformConfig } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

const TRANSFORM_ID = 'transform-test-update-1';

function getTransformUpdateConfig() {
  return {
    source: {
      index: 'ft_*',
      query: {
        term: {
          airline: {
            value: 'AAL',
          },
        },
      },
    },
    description: 'the-updated-description',
    dest: {
      index: 'user-the-updated-destination-index',
    },
    frequency: '60m',
  };
}

apiTest.describe(
  '/internal/transform/transforms/{transformId}/_update',
  { tag: tags.stateful.all },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      const config = generateTransformConfig(TRANSFORM_ID);
      await apiServices.transform.createTransform({ transform_id: TRANSFORM_ID, ...config });
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.transform.cleanTransformIndices();
    });

    apiTest('should update a transform', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformManager();

      const originalResponse = await apiClient.get(
        `internal/transform/transforms/${TRANSFORM_ID}`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...cookieHeader,
          },
          responseType: 'json',
        }
      );
      const originalBody = originalResponse.body as GetTransformsResponseSchema;

      expect(originalResponse).toHaveStatusCode(200);

      expect(originalBody.count).toBe(1);
      expect(originalBody.transforms).toHaveLength(1);

      const originalConfig = originalBody.transforms[0];
      expect(originalConfig.id).toBe(TRANSFORM_ID);
      expect(originalConfig.source).toMatchObject({
        index: ['ft_farequote'],
        query: { match_all: {} },
      });
      expect(originalConfig.description).toBeUndefined();
      expect(originalConfig.settings).toMatchObject({});

      // update the transform and assert the response
      const updateResponse = await apiClient.post(
        `internal/transform/transforms/${TRANSFORM_ID}/_update`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...cookieHeader,
          },
          body: getTransformUpdateConfig(),
          responseType: 'json',
        }
      );
      const updatedTransform = updateResponse.body as PostTransformsUpdateResponseSchema;

      expect(updateResponse).toHaveStatusCode(200);

      const expectedConfig = getTransformUpdateConfig();
      expect(updatedTransform.id).toBe(TRANSFORM_ID);
      expect(updatedTransform.source).toMatchObject({
        ...expectedConfig.source,
        index: ['ft_*'],
      });
      expect(updatedTransform.description).toBe(expectedConfig.description);
      expect(updatedTransform.settings).toMatchObject({});

      // Verify the update persisted
      const verifyResponse = await apiClient.get(`internal/transform/transforms/${TRANSFORM_ID}`, {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
        },
        responseType: 'json',
      });
      const verifyBody = verifyResponse.body as GetTransformsResponseSchema;

      expect(verifyResponse).toHaveStatusCode(200);

      expect(verifyBody.count).toBe(1);
      expect(verifyBody.transforms).toHaveLength(1);

      const verifiedConfig = verifyBody.transforms[0];
      expect(verifiedConfig.id).toBe(TRANSFORM_ID);
      expect(verifiedConfig.source).toMatchObject({
        ...expectedConfig.source,
        index: ['ft_*'],
      });
      expect(verifiedConfig.description).toBe(expectedConfig.description);
      expect(verifiedConfig.settings).toMatchObject({});
    });

    apiTest('should return 403 for transform view-only user', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformViewer();

      const { statusCode } = await apiClient.post(
        `internal/transform/transforms/${TRANSFORM_ID}/_update`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...cookieHeader,
          },
          body: getTransformUpdateConfig(),
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(403);
    });
  }
);
