/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { GetTransformsResponseSchema } from '../../../../common';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';
import { generateTransformConfig } from '../helpers/transform_config';

const TRANSFORM_1_ID = 'transform-test-get-1';
const TRANSFORM_2_ID = 'transform-test-get-2';

apiTest.describe('/internal/transform/transforms', { tag: tags.stateful.all }, () => {
  apiTest.beforeAll(async ({ apiServices }) => {
    const config1 = generateTransformConfig(TRANSFORM_1_ID);
    const config2 = generateTransformConfig(TRANSFORM_2_ID);

    await apiServices.transform.createTransform({ transform_id: TRANSFORM_1_ID, ...config1 });
    await apiServices.transform.createTransform({ transform_id: TRANSFORM_2_ID, ...config2 });
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.transform.cleanTransformIndices();
  });

  apiTest(
    'should return a list of transforms for transform manager',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformManager();

      const { body, statusCode } = await apiClient.get('internal/transform/transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
        },
        responseType: 'json',
      });
      const transformsResponse = body as GetTransformsResponseSchema;

      expect(statusCode).toBe(200);

      expect(transformsResponse.count).toBe(2);
      expect(transformsResponse.transforms).toHaveLength(2);

      // Check transform 1
      const transform1 = transformsResponse.transforms.find((t) => t.id === TRANSFORM_1_ID);
      expect(transform1).toBeDefined();
      expect(transform1!.id).toBe(TRANSFORM_1_ID);
      expect(transform1!.dest.index).toBe('user-transform-test-get-1');
      expect(typeof transform1!.version).toBe('string');
      expect(typeof transform1!.create_time).toBe('number');

      // Check transform 2
      const transform2 = transformsResponse.transforms.find((t) => t.id === TRANSFORM_2_ID);
      expect(transform2).toBeDefined();
      expect(transform2!.id).toBe(TRANSFORM_2_ID);
      expect(transform2!.dest.index).toBe('user-transform-test-get-2');
      expect(typeof transform2!.version).toBe('string');
      expect(typeof transform2!.create_time).toBe('number');
    }
  );

  apiTest(
    'should return a list of transforms for transform viewer',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformViewer();

      const { body, statusCode } = await apiClient.get('internal/transform/transforms', {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
        },
        responseType: 'json',
      });
      const transformsResponse = body as GetTransformsResponseSchema;

      expect(statusCode).toBe(200);

      expect(transformsResponse.count).toBe(2);
      expect(transformsResponse.transforms).toHaveLength(2);

      // Verify both transforms are present
      const transform1 = transformsResponse.transforms.find((t) => t.id === TRANSFORM_1_ID);
      const transform2 = transformsResponse.transforms.find((t) => t.id === TRANSFORM_2_ID);
      expect(transform1).toBeDefined();
      expect(transform2).toBeDefined();
    }
  );

  apiTest(
    'should return a specific transform configuration for transform manager',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformManager();

      const { statusCode, body } = await apiClient.get(
        `internal/transform/transforms/${TRANSFORM_1_ID}`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...cookieHeader,
          },
          responseType: 'json',
        }
      );
      const transformsResponse = body as GetTransformsResponseSchema;

      expect(statusCode).toBe(200);

      expect(transformsResponse.count).toBe(1);
      expect(transformsResponse.transforms).toHaveLength(1);

      const transform = transformsResponse.transforms[0];
      expect(transform.id).toBe(TRANSFORM_1_ID);
      expect(transform.dest.index).toBe('user-transform-test-get-1');
      expect(typeof transform.version).toBe('string');
      expect(typeof transform.create_time).toBe('number');
    }
  );

  apiTest(
    'should return a specific transform configuration for transform viewer',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformViewer();

      const { statusCode, body } = await apiClient.get(
        `internal/transform/transforms/${TRANSFORM_1_ID}`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...cookieHeader,
          },
          responseType: 'json',
        }
      );
      const transformsResponse = body as GetTransformsResponseSchema;

      expect(statusCode).toBe(200);

      expect(transformsResponse.count).toBe(1);
      expect(transformsResponse.transforms).toHaveLength(1);

      const transform = transformsResponse.transforms[0];
      expect(transform.id).toBe(TRANSFORM_1_ID);
      expect(transform.dest.index).toBe('user-transform-test-get-1');
    }
  );

  apiTest('should report 404 for a non-existing transform', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asTransformViewer();

    const { statusCode } = await apiClient.get(
      'internal/transform/transforms/the-non-existing-transform',
      {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(404);
  });
});
