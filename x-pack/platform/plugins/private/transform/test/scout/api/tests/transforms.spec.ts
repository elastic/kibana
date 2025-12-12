/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';
import { generateTransformConfig } from '../helpers/transform_config';

const TRANSFORM_1_ID = 'transform-test-get-1';
const TRANSFORM_2_ID = 'transform-test-get-2';

apiTest.describe('/internal/transform/transforms', { tag: tags.ESS_ONLY }, () => {
  let transformPowerUserApiCredentials: RoleApiCredentials;
  let transformViewerUserApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
    transformPowerUserApiCredentials = await requestAuth.loginAsTransformPowerUser();
    transformViewerUserApiCredentials = await requestAuth.loginAsTransformViewerUser();

    const config1 = generateTransformConfig(TRANSFORM_1_ID);
    const config2 = generateTransformConfig(TRANSFORM_2_ID);

    await apiServices.transform.createTransform(TRANSFORM_1_ID, config1);
    await apiServices.transform.createTransform(TRANSFORM_2_ID, config2);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.transform.cleanTransformIndices();
  });

  apiTest('should return a list of transforms for transform_admin', async ({ apiClient }) => {
    const { body, statusCode } = await apiClient.get('internal/transform/transforms', {
      headers: {
        ...COMMON_HEADERS,
        ...transformPowerUserApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(statusCode).toBe(200);

    expect(body.count).toBe(2);
    expect(body.transforms).toHaveLength(2);

    // Check transform 1
    const transform1 = body.transforms.find((t) => t.id === TRANSFORM_1_ID);
    expect(transform1).toBeDefined();
    expect(transform1!.id).toBe(TRANSFORM_1_ID);
    expect(transform1!.dest.index).toBe('user-transform-test-get-1');
    expect(typeof transform1!.version).toBe('string');
    expect(typeof transform1!.create_time).toBe('number');

    // Check transform 2
    const transform2 = body.transforms.find((t) => t.id === TRANSFORM_2_ID);
    expect(transform2).toBeDefined();
    expect(transform2!.id).toBe(TRANSFORM_2_ID);
    expect(transform2!.dest.index).toBe('user-transform-test-get-2');
    expect(typeof transform2!.version).toBe('string');
    expect(typeof transform2!.create_time).toBe('number');
  });

  apiTest('should return a list of transforms for transform_user', async ({ apiClient }) => {
    const { body, statusCode } = await apiClient.get('internal/transform/transforms', {
      headers: {
        ...COMMON_HEADERS,
        ...transformViewerUserApiCredentials.apiKeyHeader,
      },
      responseType: 'json',
    });

    expect(statusCode).toBe(200);

    expect(body.count).toBe(2);
    expect(body.transforms).toHaveLength(2);

    // Verify both transforms are present
    const transform1 = body.transforms.find((t) => t.id === TRANSFORM_1_ID);
    const transform2 = body.transforms.find((t) => t.id === TRANSFORM_2_ID);
    expect(transform1).toBeDefined();
    expect(transform2).toBeDefined();
  });

  apiTest(
    'should return a specific transform configuration for transform admin',
    async ({ apiClient }) => {
      const { statusCode, body } = await apiClient.get(
        `internal/transform/transforms/${TRANSFORM_1_ID}`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...transformPowerUserApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);

      expect(body.count).toBe(1);
      expect(body.transforms).toHaveLength(1);

      const transform = body.transforms[0];
      expect(transform.id).toBe(TRANSFORM_1_ID);
      expect(transform.dest.index).toBe('user-transform-test-get-1');
      expect(typeof transform.version).toBe('string');
      expect(typeof transform.create_time).toBe('number');
    }
  );

  apiTest(
    'should return a specific transform configuration for transform user',
    async ({ apiClient }) => {
      const { statusCode, body } = await apiClient.get(
        `internal/transform/transforms/${TRANSFORM_1_ID}`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...transformViewerUserApiCredentials.apiKeyHeader,
          },
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);

      expect(body.count).toBe(1);
      expect(body.transforms).toHaveLength(1);

      const transform = body.transforms[0];
      expect(transform.id).toBe(TRANSFORM_1_ID);
      expect(transform.dest.index).toBe('user-transform-test-get-1');
    }
  );

  apiTest('should report 404 for a non-existing transform', async ({ apiClient }) => {
    const { statusCode } = await apiClient.get(
      'internal/transform/transforms/the-non-existing-transform',
      {
        headers: {
          ...COMMON_HEADERS,
          ...transformViewerUserApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(404);
  });
});
