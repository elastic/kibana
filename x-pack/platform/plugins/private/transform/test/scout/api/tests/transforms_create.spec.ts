/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import {
  createTransformRoles,
  createTransformUsers,
  cleanTransformRoles,
  cleanTransformUsers,
} from '../helpers/transform_users';
import { generateTransformConfig, generateDestIndex } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures/transform_test_fixture';

apiTest.describe(
  '/internal/transform/transforms/{transformId}/ create',
  { tag: tags.ESS_ONLY },
  () => {
    apiTest.beforeAll(async ({ kbnClient, transformApi }) => {
      // Set Kibana timezone to UTC
      await transformApi.setKibanaTimeZoneToUTC();

      // Create transform roles and users
      await createTransformRoles(kbnClient);
      await createTransformUsers(kbnClient);
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

    apiTest('should create a transform', async ({ makeTransformRequest }) => {
      const transformId = 'test_transform_id_create';

      const { statusCode, body } = await makeTransformRequest<any>({
        method: 'put',
        path: `internal/transform/transforms/${transformId}`,
        role: 'poweruser',
        body: generateTransformConfig(transformId),
      });

      expect(statusCode).toBe(200);

      expect(body).toEqual({
        dataViewsCreated: [],
        dataViewsErrors: [],
        errors: [],
        transformsCreated: [
          {
            transform: transformId,
          },
        ],
      });
    });

    apiTest(
      'should create a transform with data view',
      async ({ makeTransformRequest, transformApi }) => {
        const transformId = 'test_transform_id_create_with_data_view';
        const destinationIndex = generateDestIndex(transformId);

        const { statusCode, body } = await makeTransformRequest<any>({
          method: 'put',
          path: `internal/transform/transforms/${transformId}?createDataView=true`,
          role: 'poweruser',
          body: generateTransformConfig(transformId),
        });

        expect(statusCode).toBe(200);

        expect(body.dataViewsCreated).toHaveLength(1);
        expect(body.dataViewsErrors).toHaveLength(0);
        expect(body.errors).toHaveLength(0);
        expect(body.transformsCreated).toEqual([
          {
            transform: transformId,
          },
        ]);

        // Clean up data view
        await transformApi.deleteDataViewByTitle(destinationIndex);
      }
    );

    apiTest(
      'should create a transform with data view and time field',
      async ({ makeTransformRequest, transformApi }) => {
        const transformId = 'test_transform_id_create_with_data_view_and_time_field';
        const destinationIndex = generateDestIndex(transformId);

        const { statusCode, body } = await makeTransformRequest<any>({
          method: 'put',
          path: `internal/transform/transforms/${transformId}?createDataView=true&timeFieldName=@timestamp`,
          role: 'poweruser',
          body: generateTransformConfig(transformId),
        });

        expect(statusCode).toBe(200);

        expect(body.dataViewsCreated).toHaveLength(1);
        expect(body.dataViewsErrors).toHaveLength(0);
        expect(body.errors).toHaveLength(0);
        expect(body.transformsCreated).toEqual([
          {
            transform: transformId,
          },
        ]);

        // Clean up data view
        await transformApi.deleteDataViewByTitle(destinationIndex);
      }
    );

    apiTest(
      'should not allow pivot and latest configs in same transform',
      async ({ makeTransformRequest }) => {
        const transformId = 'test_transform_id_fail';

        const { statusCode, body } = await makeTransformRequest<any>({
          method: 'put',
          path: `internal/transform/transforms/${transformId}`,
          role: 'poweruser',
          body: {
            ...generateTransformConfig(transformId),
            latest: {
              unique_key: ['country', 'gender'],
              sort: 'infected',
            },
          },
        });

        expect(statusCode).toBe(400);

        expect(body.message).toBe('[request body]: pivot and latest are not allowed together');
      }
    );

    apiTest('should ensure if pivot or latest is provided', async ({ makeTransformRequest }) => {
      const transformId = 'test_transform_id_fail';

      const { pivot, ...config } = generateTransformConfig(transformId);

      const { statusCode, body } = await makeTransformRequest<any>({
        method: 'put',
        path: `internal/transform/transforms/${transformId}`,
        role: 'poweruser',
        body: config,
      });

      expect(statusCode).toBe(400);

      expect(body.message).toBe(
        '[request body]: pivot or latest is required for transform configuration'
      );
    });
  }
);
