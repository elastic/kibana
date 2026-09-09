/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS } from '../constants';
import { apiTest } from '../fixtures';

const CLASSIC_SPACE = 'classic-space';
const SOLUTION_SPACE = 'solution-space';

apiTest.describe(
  'GET /internal/spaces/space/{id}/persisted_feature_visibility',
  { tag: tags.stateful.all },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ kbnClient, samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));

      await kbnClient.request({
        method: 'POST',
        path: '/api/spaces/space',
        body: {
          id: CLASSIC_SPACE,
          name: 'Classic Space',
          disabledFeatures: ['feature_1', 'feature_2'],
          solution: 'classic',
        },
      });

      await kbnClient.request({
        method: 'POST',
        path: '/api/spaces/space',
        body: {
          id: SOLUTION_SPACE,
          name: 'Solution Space',
          disabledFeatures: ['feature_3', 'feature_4'],
          solution: 'es',
        },
      });
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete(CLASSIC_SPACE);
      await apiServices.spaces.delete(SOLUTION_SPACE);
    });

    apiTest('returns stored disabledFeatures for a classic space', async ({ apiClient }) => {
      const response = await apiClient.get(
        `internal/spaces/space/${CLASSIC_SPACE}/persisted_feature_visibility`,
        { headers: { ...COMMON_HEADERS, ...cookieHeader } }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        featureVisibility: { disabledFeatures: ['feature_1', 'feature_2'] },
      });
    });

    apiTest(
      'returns stored disabledFeatures for a space with a non-classic solution view',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `internal/spaces/space/${SOLUTION_SPACE}/persisted_feature_visibility`,
          { headers: { ...COMMON_HEADERS, ...cookieHeader } }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({
          featureVisibility: { disabledFeatures: ['feature_3', 'feature_4'] },
        });
      }
    );

    apiTest('returns 404 when the space is not found', async ({ apiClient }) => {
      const response = await apiClient.get(
        'internal/spaces/space/not-found-space/persisted_feature_visibility',
        { headers: { ...COMMON_HEADERS, ...cookieHeader } }
      );

      expect(response).toHaveStatusCode(404);
      expect(response.body).toStrictEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found',
      });
    });
  }
);
