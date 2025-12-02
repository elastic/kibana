/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import type { GetTransformsResponseSchema } from '../../../../server/routes/api_schemas/transforms';
import {
  createTransformRoles,
  createTransformUsers,
  cleanTransformRoles,
  cleanTransformUsers,
} from '../helpers/transform_users';
import { generateTransformConfig } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures/transform_test_fixture';

const TRANSFORM_1_ID = 'transform-test-get-1';
const TRANSFORM_2_ID = 'transform-test-get-2';

apiTest.describe('/internal/transform/transforms', { tag: tags.ESS_ONLY }, () => {
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

  apiTest.describe('/transforms', () => {
    apiTest(
      'should return a list of transforms for super-user',
      async ({ makeTransformRequest }) => {
        const { statusCode, body } = await makeTransformRequest<GetTransformsResponseSchema>({
          method: 'get',
          path: 'internal/transform/transforms',
          role: 'poweruser',
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
      }
    );

    apiTest(
      'should return a list of transforms for transform view-only user',
      async ({ makeTransformRequest }) => {
        const { statusCode, body } = await makeTransformRequest<GetTransformsResponseSchema>({
          method: 'get',
          path: 'internal/transform/transforms',
          role: 'viewer',
        });

        expect(statusCode).toBe(200);

        expect(body.count).toBe(2);
        expect(body.transforms).toHaveLength(2);

        // Verify both transforms are present
        const transform1 = body.transforms.find((t) => t.id === TRANSFORM_1_ID);
        const transform2 = body.transforms.find((t) => t.id === TRANSFORM_2_ID);
        expect(transform1).toBeDefined();
        expect(transform2).toBeDefined();
      }
    );
  });

  apiTest.describe('/transforms/{transformId}', () => {
    apiTest(
      'should return a specific transform configuration for super-user',
      async ({ makeTransformRequest }) => {
        const { statusCode, body } = await makeTransformRequest<GetTransformsResponseSchema>({
          method: 'get',
          path: `internal/transform/transforms/${TRANSFORM_1_ID}`,
          role: 'poweruser',
        });

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
      'should return a specific transform configuration transform view-only user',
      async ({ makeTransformRequest }) => {
        const { statusCode, body } = await makeTransformRequest<GetTransformsResponseSchema>({
          method: 'get',
          path: `internal/transform/transforms/${TRANSFORM_1_ID}`,
          role: 'viewer',
        });

        expect(statusCode).toBe(200);

        expect(body.count).toBe(1);
        expect(body.transforms).toHaveLength(1);

        const transform = body.transforms[0];
        expect(transform.id).toBe(TRANSFORM_1_ID);
        expect(transform.dest.index).toBe('user-transform-test-get-1');
      }
    );

    apiTest('should report 404 for a non-existing transform', async ({ makeTransformRequest }) => {
      const { statusCode } = await makeTransformRequest({
        method: 'get',
        path: 'internal/transform/transforms/the-non-existing-transform',
        role: 'poweruser',
      });

      expect(statusCode).toBe(404);
    });
  });
});
