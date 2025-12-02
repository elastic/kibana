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
    apiTest.beforeAll(async ({ kbnClient, transformApi }) => {
      // Set Kibana timezone to UTC
      await transformApi.setKibanaTimeZoneToUTC();

      // Create transform roles and users
      await createTransformRoles(kbnClient);
      await createTransformUsers(kbnClient);

      // Create transform
      const config = generateTransformConfig(TRANSFORM_ID);
      await transformApi.createTransform(TRANSFORM_ID, config);
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

    apiTest('should update a transform', async ({ makeTransformRequest }) => {
      // Get original transform config
      const originalResponse = await makeTransformRequest<GetTransformsResponseSchema>({
        method: 'get',
        path: `internal/transform/transforms/${TRANSFORM_ID}`,
        role: 'poweruser',
      });

      expect(originalResponse.statusCode).toBe(200);

      expect(originalResponse.body.count).toBe(1);
      expect(originalResponse.body.transforms).toHaveLength(1);

      const originalConfig = originalResponse.body.transforms[0];
      expect(originalConfig.id).toBe(TRANSFORM_ID);
      expect(originalConfig.source).toEqual({
        index: ['ft_farequote'],
        query: { match_all: {} },
      });
      expect(originalConfig.description).toBeUndefined();
      expect(originalConfig.settings).toEqual({});

      // Update the transform
      const updateResponse = await makeTransformRequest<any>({
        method: 'post',
        path: `internal/transform/transforms/${TRANSFORM_ID}/_update`,
        role: 'poweruser',
        body: getTransformUpdateConfig(),
      });

      expect(updateResponse.statusCode).toBe(200);

      const expectedConfig = getTransformUpdateConfig();
      expect(updateResponse.body.id).toBe(TRANSFORM_ID);
      expect(updateResponse.body.source).toEqual({
        ...expectedConfig.source,
        index: ['ft_*'],
      });
      expect(updateResponse.body.description).toBe(expectedConfig.description);
      expect(updateResponse.body.settings).toEqual({});

      // Verify the update persisted
      const verifyResponse = await makeTransformRequest<GetTransformsResponseSchema>({
        method: 'get',
        path: `internal/transform/transforms/${TRANSFORM_ID}`,
        role: 'poweruser',
      });

      expect(verifyResponse.statusCode).toBe(200);

      expect(verifyResponse.body.count).toBe(1);
      expect(verifyResponse.body.transforms).toHaveLength(1);

      const verifiedConfig = verifyResponse.body.transforms[0];
      expect(verifiedConfig.id).toBe(TRANSFORM_ID);
      expect(verifiedConfig.source).toEqual({
        ...expectedConfig.source,
        index: ['ft_*'],
      });
      expect(verifiedConfig.description).toBe(expectedConfig.description);
      expect(verifiedConfig.settings).toEqual({});
    });

    apiTest('should return 403 for transform view-only user', async ({ makeTransformRequest }) => {
      const { statusCode } = await makeTransformRequest({
        method: 'post',
        path: `internal/transform/transforms/${TRANSFORM_ID}/_update`,
        role: 'viewer',
        body: getTransformUpdateConfig(),
      });

      expect(statusCode).toBe(403);
    });
  }
);
