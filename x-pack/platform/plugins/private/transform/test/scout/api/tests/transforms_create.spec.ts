/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import { generateTransformConfig, generateDestIndex } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from './constants';

apiTest.describe(
  '/internal/transform/transforms/{transformId}/ create',
  { tag: tags.ESS_ONLY },
  () => {
    let transformPowerUserApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      transformPowerUserApiCredentials = await requestAuth.loginAsTransformPowerUser();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.transform.cleanTransformIndices();
    });

    apiTest('should create a transform', async ({ apiClient }) => {
      const transformId = 'test_transform_id_create';

      const { statusCode, body } = await apiClient.put(
        `internal/transform/transforms/${transformId}`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...transformPowerUserApiCredentials.apiKeyHeader,
          },
          body: generateTransformConfig(transformId),
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);

      expect(body).toMatchObject({
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

    apiTest('should create a transform with data view', async ({ apiClient, apiServices }) => {
      const transformId = 'test_transform_id_create_with_data_view';
      const destinationIndex = generateDestIndex(transformId);

      const { statusCode, body } = await apiClient.put(
        `internal/transform/transforms/${transformId}?createDataView=true`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...transformPowerUserApiCredentials.apiKeyHeader,
          },
          body: generateTransformConfig(transformId),
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);

      // The data view id will be returned as a non-deterministic uuid
      // so we cannot assert the actual id returned. We'll just assert
      // that a data view has been created a no errors were returned.
      expect(body.dataViewsCreated).toHaveLength(1);
      expect(body.dataViewsErrors).toHaveLength(0);
      expect(body.errors).toHaveLength(0);
      expect(body.transformsCreated).toMatchObject([
        {
          transform: transformId,
        },
      ]);

      // Clean up data view
      await apiServices.transform.deleteDataViewByTitle(destinationIndex);
    });

    apiTest(
      'should create a transform with data view and time field',
      async ({ apiClient, apiServices }) => {
        const transformId = 'test_transform_id_create_with_data_view_and_time_field';
        const destinationIndex = generateDestIndex(transformId);

        const { statusCode, body } = await apiClient.put(
          `internal/transform/transforms/${transformId}?createDataView=true&timeFieldName=@timestamp`,
          {
            headers: {
              ...COMMON_HEADERS,
              ...transformPowerUserApiCredentials.apiKeyHeader,
            },
            body: generateTransformConfig(transformId),
            responseType: 'json',
          }
        );

        expect(statusCode).toBe(200);

        // The data view id will be returned as a non-deterministic uuid
        // so we cannot assert the actual id returned. We'll just assert
        // that a data view has been created a no errors were returned.
        expect(body.dataViewsCreated).toHaveLength(1);
        expect(body.dataViewsErrors).toHaveLength(0);
        expect(body.errors).toHaveLength(0);
        expect(body.transformsCreated).toMatchObject([
          {
            transform: transformId,
          },
        ]);

        // Clean up data view
        await apiServices.transform.deleteDataViewByTitle(destinationIndex);
      }
    );

    apiTest(
      'should not allow pivot and latest configs in same transform',
      async ({ apiClient }) => {
        const transformId = 'test_transform_id_fail';

        const { statusCode, body } = await apiClient.put(
          `internal/transform/transforms/${transformId}`,
          {
            headers: {
              ...COMMON_HEADERS,
              ...transformPowerUserApiCredentials.apiKeyHeader,
            },
            body: {
              ...generateTransformConfig(transformId),
              latest: {
                unique_key: ['country', 'gender'],
                sort: 'infected',
              },
            },
            responseType: 'json',
          }
        );

        expect(statusCode).toBe(400);

        expect(body.message).toBe('[request body]: pivot and latest are not allowed together');
      }
    );

    apiTest('should ensure if pivot or latest is provided', async ({ apiClient }) => {
      const transformId = 'test_transform_id_fail';

      const { pivot, ...config } = generateTransformConfig(transformId);

      const { statusCode, body } = await apiClient.put(
        `internal/transform/transforms/${transformId}`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...transformPowerUserApiCredentials.apiKeyHeader,
          },
          body: config,
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(400);

      expect(body.message).toBe(
        '[request body]: pivot or latest is required for transform configuration'
      );
    });
  }
);
