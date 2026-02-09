/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { GetTransformsStatsResponseSchema } from '../../../../common';
import { TRANSFORM_STATE } from '../../../../common/constants';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';
import { generateTransformConfig } from '../helpers/transform_config';

const TRANSFORM_1_ID = 'transform-test-stats-1';
const TRANSFORM_2_ID = 'transform-test-stats-2';

apiTest.describe('/internal/transform/transforms/_stats', { tag: tags.ESS_ONLY }, () => {
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
    'should return a list of transforms statistics for transform manager',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformManager();

      const { statusCode, body } = await apiClient.get('internal/transform/transforms/_stats', {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
        },
        responseType: 'json',
      });
      const statsResponse = body as GetTransformsStatsResponseSchema;

      expect(statusCode).toBe(200);

      expect(statsResponse.count).toBe(2);
      expect(statsResponse.transforms).toHaveLength(2);

      // Check transform 1 stats
      const transform1Stats = statsResponse.transforms.find((t) => t.id === TRANSFORM_1_ID);
      expect(transform1Stats).toBeDefined();
      expect(transform1Stats!.id).toBe(TRANSFORM_1_ID);
      expect(transform1Stats!.state).toBe(TRANSFORM_STATE.STOPPED);
      expect(typeof transform1Stats!.stats).toBe('object');
      expect(typeof transform1Stats!.checkpointing).toBe('object');

      // Check transform 2 stats
      const transform2Stats = statsResponse.transforms.find((t) => t.id === TRANSFORM_2_ID);
      expect(transform2Stats).toBeDefined();
      expect(transform2Stats!.id).toBe(TRANSFORM_2_ID);
      expect(transform2Stats!.state).toBe(TRANSFORM_STATE.STOPPED);
      expect(typeof transform2Stats!.stats).toBe('object');
      expect(typeof transform2Stats!.checkpointing).toBe('object');
    }
  );

  apiTest(
    'should return statistics for a single transform for transform manager',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformManager();

      const { statusCode, body } = await apiClient.get(
        `internal/transform/transforms/${TRANSFORM_1_ID}/_stats`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...cookieHeader,
          },
          responseType: 'json',
        }
      );
      const statsResponse = body as GetTransformsStatsResponseSchema;

      expect(statusCode).toBe(200);

      expect(statsResponse.count).toBe(1);
      expect(statsResponse.transforms).toHaveLength(1);

      const transformStats = statsResponse.transforms[0];
      expect(transformStats.id).toBe(TRANSFORM_1_ID);
      expect(transformStats.state).toBe(TRANSFORM_STATE.STOPPED);
      expect(typeof transformStats.stats).toBe('object');
      expect(typeof transformStats.checkpointing).toBe('object');
    }
  );

  apiTest(
    'should return a list of transforms statistics for transform viewer',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformViewer();

      const { statusCode, body } = await apiClient.get('internal/transform/transforms/_stats', {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
        },
        responseType: 'json',
      });
      const statsResponse = body as GetTransformsStatsResponseSchema;

      expect(statusCode).toBe(200);

      expect(statsResponse.count).toBe(2);
      expect(statsResponse.transforms).toHaveLength(2);

      // Verify both transforms are present
      const transform1Stats = statsResponse.transforms.find((t) => t.id === TRANSFORM_1_ID);
      const transform2Stats = statsResponse.transforms.find((t) => t.id === TRANSFORM_2_ID);
      expect(transform1Stats).toBeDefined();
      expect(transform2Stats).toBeDefined();
      expect(transform1Stats!.state).toBe(TRANSFORM_STATE.STOPPED);
      expect(transform2Stats!.state).toBe(TRANSFORM_STATE.STOPPED);
    }
  );

  apiTest(
    'should return statistics for a single transform for transform viewer',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asTransformViewer();

      const { statusCode, body } = await apiClient.get(
        `internal/transform/transforms/${TRANSFORM_2_ID}/_stats`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...cookieHeader,
          },
          responseType: 'json',
        }
      );
      const statsResponse = body as GetTransformsStatsResponseSchema;

      expect(statusCode).toBe(200);

      expect(statsResponse.count).toBe(1);
      expect(statsResponse.transforms).toHaveLength(1);

      const transformStats = statsResponse.transforms[0];
      expect(transformStats.id).toBe(TRANSFORM_2_ID);
      expect(transformStats.state).toBe(TRANSFORM_STATE.STOPPED);
    }
  );
});
