/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
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
  { tag: tags.ESS_ONLY },
  () => {
    let transformPowerUserApiCredentials: RoleApiCredentials;
    let transformViewerUserApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      transformPowerUserApiCredentials = await requestAuth.loginAsTransformPowerUser();
      transformViewerUserApiCredentials = await requestAuth.loginAsTransformViewerUser();

      const config = generateTransformConfig(TRANSFORM_ID);
      await apiServices.transform.createTransform(TRANSFORM_ID, config);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.transform.cleanTransformIndices();
    });

    apiTest('should update a transform', async ({ apiClient }) => {
      const originalResponse = await apiClient.get(
        `internal/transform/transforms/${TRANSFORM_ID}`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...transformPowerUserApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        }
      );

      expect(originalResponse.statusCode).toBe(200);

      expect(originalResponse.body.count).toBe(1);
      expect(originalResponse.body.transforms).toHaveLength(1);

      const originalConfig = originalResponse.body.transforms[0];
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
            ...transformPowerUserApiCredentials.apiKeyHeader,
          },
          body: getTransformUpdateConfig(),
          responseType: 'json',
        }
      );

      expect(updateResponse.statusCode).toBe(200);

      const expectedConfig = getTransformUpdateConfig();
      expect(updateResponse.body.id).toBe(TRANSFORM_ID);
      expect(updateResponse.body.source).toMatchObject({
        ...expectedConfig.source,
        index: ['ft_*'],
      });
      expect(updateResponse.body.description).toBe(expectedConfig.description);
      expect(updateResponse.body.settings).toMatchObject({});

      // Verify the update persisted
      const verifyResponse = await apiClient.get(`internal/transform/transforms/${TRANSFORM_ID}`, {
        headers: {
          ...COMMON_HEADERS,
          ...transformPowerUserApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(verifyResponse.statusCode).toBe(200);

      expect(verifyResponse.body.count).toBe(1);
      expect(verifyResponse.body.transforms).toHaveLength(1);

      const verifiedConfig = verifyResponse.body.transforms[0];
      expect(verifiedConfig.id).toBe(TRANSFORM_ID);
      expect(verifiedConfig.source).toMatchObject({
        ...expectedConfig.source,
        index: ['ft_*'],
      });
      expect(verifiedConfig.description).toBe(expectedConfig.description);
      expect(verifiedConfig.settings).toMatchObject({});
    });

    apiTest('should return 403 for transform view-only user', async ({ apiClient }) => {
      const { statusCode } = await apiClient.post(
        `internal/transform/transforms/${TRANSFORM_ID}/_update`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...transformViewerUserApiCredentials.apiKeyHeader,
          },
          body: getTransformUpdateConfig(),
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(403);
    });
  }
);
