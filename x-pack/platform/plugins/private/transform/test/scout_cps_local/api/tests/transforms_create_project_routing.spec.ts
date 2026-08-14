/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { MOCK_IDP_UIAM_PROJECT_ID2 } from '@kbn/mock-idp-utils';
import { PROJECT_ROUTING } from '@kbn/cps-utils';
import type { CookieHeader } from '@kbn/scout';
import type { PutTransformsResponseSchema } from '../../../../common';
import {
  generateDestIndex,
  generateTransformConfig,
} from '../../../scout/api/helpers/transform_config';
import { transformApiTest as apiTest } from '../../../scout/api/fixtures';
import { COMMON_HEADERS } from '../../../scout/api/constants';

/**
 * Requires a CPS-enabled Scout server (`--serverConfigSet cps_local`).
 * Standard serverless Security Complete does not enable CPS, so this suite lives
 * under `scout_cps_local` and runs via `.buildkite/scripts/steps/test/scout/cps_testing.sh`.
 *
 * Linked project id matches `MOCK_IDP_UIAM_PROJECT_ID2` from `@kbn/mock-idp-utils`
 * (registered by the cps_local Scout stack).
 */
const LINKED_PROJECT_ROUTING = `_id:${MOCK_IDP_UIAM_PROJECT_ID2}`;

apiTest.describe(
  '/internal/transform/transforms/{transformId} create with project routing',
  { tag: tags.serverless.security.complete },
  () => {
    const transformId = 'test_transform_id_create_with_project_routing';
    const projectRouting = LINKED_PROJECT_ROUTING;
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
      'should save and update the selected project routing value',
      async ({ apiClient, apiServices }) => {
        const transformConfig = generateTransformConfig(transformId);
        const updatedProjectRouting = PROJECT_ROUTING.ALL;

        await apiTest.step('creates a transform with project routing', async () => {
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

          const transform = await apiServices.transform.getTransform({
            transform_id: transformId,
          });
          expect(transform.source.project_routing).toBe(projectRouting);
        });

        await apiTest.step('updates the project routing on the existing transform', async () => {
          const { statusCode: updateStatusCode } = await apiClient.post(
            `internal/transform/transforms/${transformId}/_update`,
            {
              headers: {
                ...COMMON_HEADERS,
                ...transformManagerCookieHeader,
              },
              body: {
                source: {
                  project_routing: updatedProjectRouting,
                },
              },
              responseType: 'json',
            }
          );

          expect(updateStatusCode).toBe(200);

          const updatedTransform = await apiServices.transform.getTransform({
            transform_id: transformId,
          });
          expect(updatedTransform.source.project_routing).toBe(updatedProjectRouting);
        });
      }
    );
  }
);
