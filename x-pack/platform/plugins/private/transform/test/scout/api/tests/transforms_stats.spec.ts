/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import { TRANSFORM_STATE } from '../../../../common/constants';
import type { GetTransformsStatsResponseSchema } from '../../../../server/routes/api_schemas/transforms_stats';
import {
  createTransformRoles,
  createTransformUsers,
  cleanTransformRoles,
  cleanTransformUsers,
} from '../helpers/transform_users';
import { generateTransformConfig } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures/transform_test_fixture';

const TRANSFORM_1_ID = 'transform-test-stats-1';
const TRANSFORM_2_ID = 'transform-test-stats-2';

apiTest.describe('/internal/transform/transforms/_stats', { tag: tags.ESS_ONLY }, () => {
  apiTest.beforeAll(async ({ kbnClient, transformApi }) => {
    // Set Kibana timezone to UTC
    await transformApi.setKibanaTimeZoneToUTC();

    // Create transform roles and users
    await createTransformRoles(kbnClient);
    await createTransformUsers(kbnClient);

    // Create test transforms
    const config1 = generateTransformConfig(TRANSFORM_1_ID);
    const config2 = generateTransformConfig(TRANSFORM_2_ID);

    await transformApi.createTransform(TRANSFORM_1_ID, config1);
    await transformApi.createTransform(TRANSFORM_2_ID, config2);
  });

  apiTest.afterAll(async ({ kbnClient, transformApi }) => {
    // Clean transform indices
    await transformApi.cleanTransformIndices();

    // Clean transform users and roles
    await cleanTransformUsers(kbnClient);
    await cleanTransformRoles(kbnClient);

    // Reset Kibana timezone
    await transformApi.resetKibanaTimeZone();
  });

  apiTest(
    'should return a list of transforms statistics for super-user',
    async ({ makeTransformRequest }) => {
      const { statusCode, body } = await makeTransformRequest<GetTransformsStatsResponseSchema>({
        method: 'get',
        path: 'internal/transform/transforms/_stats',
        role: 'poweruser',
      });

      expect(statusCode).toBe(200);

      expect(body.count).toBe(2);
      expect(body.transforms).toHaveLength(2);

      // Check transform 1 stats
      const transform1Stats = body.transforms.find((t) => t.id === TRANSFORM_1_ID);
      expect(transform1Stats).toBeDefined();
      expect(transform1Stats!.id).toBe(TRANSFORM_1_ID);
      expect(transform1Stats!.state).toBe(TRANSFORM_STATE.STOPPED);
      expect(typeof transform1Stats!.stats).toBe('object');
      expect(typeof transform1Stats!.checkpointing).toBe('object');

      // Check transform 2 stats
      const transform2Stats = body.transforms.find((t) => t.id === TRANSFORM_2_ID);
      expect(transform2Stats).toBeDefined();
      expect(transform2Stats!.id).toBe(TRANSFORM_2_ID);
      expect(transform2Stats!.state).toBe(TRANSFORM_STATE.STOPPED);
      expect(typeof transform2Stats!.stats).toBe('object');
      expect(typeof transform2Stats!.checkpointing).toBe('object');
    }
  );

  apiTest(
    'should return statistics for a single transform for super-user',
    async ({ makeTransformRequest }) => {
      const { statusCode, body } = await makeTransformRequest<GetTransformsStatsResponseSchema>({
        method: 'get',
        path: `internal/transform/transforms/${TRANSFORM_1_ID}/_stats`,
        role: 'poweruser',
      });

      expect(statusCode).toBe(200);

      expect(body.count).toBe(1);
      expect(body.transforms).toHaveLength(1);

      const transformStats = body.transforms[0];
      expect(transformStats.id).toBe(TRANSFORM_1_ID);
      expect(transformStats.state).toBe(TRANSFORM_STATE.STOPPED);
      expect(typeof transformStats.stats).toBe('object');
      expect(typeof transformStats.checkpointing).toBe('object');
    }
  );

  apiTest(
    'should return a list of transforms statistics view-only user',
    async ({ makeTransformRequest }) => {
      const { statusCode, body } = await makeTransformRequest<GetTransformsStatsResponseSchema>({
        method: 'get',
        path: 'internal/transform/transforms/_stats',
        role: 'viewer',
      });

      expect(statusCode).toBe(200);

      expect(body.count).toBe(2);
      expect(body.transforms).toHaveLength(2);

      // Verify both transforms are present
      const transform1Stats = body.transforms.find((t) => t.id === TRANSFORM_1_ID);
      const transform2Stats = body.transforms.find((t) => t.id === TRANSFORM_2_ID);
      expect(transform1Stats).toBeDefined();
      expect(transform2Stats).toBeDefined();
      expect(transform1Stats!.state).toBe(TRANSFORM_STATE.STOPPED);
      expect(transform2Stats!.state).toBe(TRANSFORM_STATE.STOPPED);
    }
  );

  apiTest(
    'should return statistics for a single transform for view-only user',
    async ({ makeTransformRequest }) => {
      const { statusCode, body } = await makeTransformRequest<GetTransformsStatsResponseSchema>({
        method: 'get',
        path: `internal/transform/transforms/${TRANSFORM_2_ID}/_stats`,
        role: 'viewer',
      });

      expect(statusCode).toBe(200);

      expect(body.count).toBe(1);
      expect(body.transforms).toHaveLength(1);

      const transformStats = body.transforms[0];
      expect(transformStats.id).toBe(TRANSFORM_2_ID);
      expect(transformStats.state).toBe(TRANSFORM_STATE.STOPPED);
    }
  );
});
