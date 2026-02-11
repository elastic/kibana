/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { CookieHeader } from '@kbn/scout';
import type { PutTransformsResponseSchema } from '../../../../common';
import { generateTransformConfig, generateDestIndex } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

apiTest.describe(
  '/internal/transform/transforms/{transformId} create',
  { tag: tags.ESS_ONLY },
  () => {
    let dataViewToBeDeletedTitle: string | undefined;
    let transformManagerCookieHeader: CookieHeader;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const credentials = await samlAuth.asTransformManager();
      transformManagerCookieHeader = credentials.cookieHeader;
    });

    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.transform.cleanTransformIndices();

      if (dataViewToBeDeletedTitle) {
        await apiServices.dataViews.deleteByTitle(dataViewToBeDeletedTitle);
        dataViewToBeDeletedTitle = undefined; // reset after deletion
      }
    });

    apiTest('should create a transform', async ({ apiClient }) => {
      const transformId = 'test_transform_id_create';

      const { statusCode, body } = await apiClient.put(
        `internal/transform/transforms/${transformId}`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...transformManagerCookieHeader,
          },
          body: generateTransformConfig(transformId),
          responseType: 'json',
        }
      );
      const createResponse = body as PutTransformsResponseSchema;

      expect(statusCode).toBe(200);

      expect(createResponse).toMatchObject({
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

    apiTest('should create a transform with data view', async ({ apiClient }) => {
      const transformId = 'test_transform_id_create_with_data_view';
      const destinationIndex = generateDestIndex(transformId);

      const { statusCode, body } = await apiClient.put(
        `internal/transform/transforms/${transformId}?createDataView=true`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...transformManagerCookieHeader,
          },
          body: generateTransformConfig(transformId),
          responseType: 'json',
        }
      );
      const createResponse = body as PutTransformsResponseSchema;

      expect(statusCode).toBe(200);

      // The data view id will be returned as a non-deterministic uuid
      // so we cannot assert the actual id returned. We'll just assert
      // that a data view has been created a no errors were returned.
      expect(createResponse.dataViewsCreated).toHaveLength(1);
      expect(createResponse.dataViewsErrors).toHaveLength(0);
      expect(createResponse.errors).toHaveLength(0);
      expect(createResponse.transformsCreated).toMatchObject([
        {
          transform: transformId,
        },
      ]);

      // clean up data view after test
      dataViewToBeDeletedTitle = destinationIndex;
    });

    apiTest('should create a transform with data view and time field', async ({ apiClient }) => {
      const transformId = 'test_transform_id_create_with_data_view_and_time_field';
      const destinationIndex = generateDestIndex(transformId);

      const { statusCode, body } = await apiClient.put(
        `internal/transform/transforms/${transformId}?createDataView=true&timeFieldName=@timestamp`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...transformManagerCookieHeader,
          },
          body: generateTransformConfig(transformId),
          responseType: 'json',
        }
      );
      const createResponse = body as PutTransformsResponseSchema;

      expect(statusCode).toBe(200);

      // The data view id will be returned as a non-deterministic uuid
      // so we cannot assert the actual id returned. We'll just assert
      // that a data view has been created a no errors were returned.
      expect(createResponse.dataViewsCreated).toHaveLength(1);
      expect(createResponse.dataViewsErrors).toHaveLength(0);
      expect(createResponse.errors).toHaveLength(0);
      expect(createResponse.transformsCreated).toMatchObject([
        {
          transform: transformId,
        },
      ]);

      // clean up data view after test
      dataViewToBeDeletedTitle = destinationIndex;
    });

    apiTest(
      'should not allow pivot and latest configs in same transform',
      async ({ apiClient }) => {
        const transformId = 'test_transform_id_fail';

        const { statusCode, body } = await apiClient.put(
          `internal/transform/transforms/${transformId}`,
          {
            headers: {
              ...COMMON_HEADERS,
              ...transformManagerCookieHeader,
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
            ...transformManagerCookieHeader,
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
