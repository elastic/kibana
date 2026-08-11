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
import { generateDestIndex, generateTransformConfig } from '../helpers/transform_config';
import { transformApiTest as apiTest } from '../fixtures';
import { COMMON_HEADERS } from '../constants';

apiTest.describe(
  '/internal/transform/transforms/{transformId} create with project routing',
  { tag: tags.serverless.security.complete },
  () => {
    const transformId = 'test_transform_id_create_with_project_routing';
    const projectRouting = '_id:linked-id';
    let transformManagerCookieHeader: CookieHeader;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const credentials = await samlAuth.asTransformManager();
      transformManagerCookieHeader = credentials.cookieHeader;
    });

    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.transform.cleanTransformIndices();
      await apiServices.transform.deleteIndices({
        index: generateDestIndex(transformId),
      });
    });

    apiTest(
      'should save the selected project routing value',
      async ({ apiClient, apiServices }) => {
        const transformConfig = generateTransformConfig(transformId);

        const { statusCode, body } = await apiClient.put(
          `internal/transform/transforms/${transformId}?deferValidation=true`,
          {
            headers: {
              ...COMMON_HEADERS,
              ...transformManagerCookieHeader,
            },
            body: {
              ...transformConfig,
              source: {
                ...transformConfig.source,
                project_routing: projectRouting,
              },
            },
            responseType: 'json',
          }
        );
        const createResponse = body as PutTransformsResponseSchema;

        expect(statusCode).toBe(200);
        expect(createResponse.errors).toHaveLength(0);
        expect(createResponse.transformsCreated).toMatchObject([
          {
            transform: transformId,
          },
        ]);

        const transform = await apiServices.transform.getTransform({ transform_id: transformId });
        expect(transform.source.project_routing).toBe(projectRouting);
      }
    );
  }
);
