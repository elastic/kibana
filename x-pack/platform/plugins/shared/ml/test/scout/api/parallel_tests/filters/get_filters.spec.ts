/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';

// TODO: Add the ECH cloud tag once support for custom roles is implemented.
// See related issue: https://github.com/elastic/kibana/issues/259284
apiTest.describe(
  'get_filters',
  {
    tag: [
      '@local-stateful-classic',
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    const validFilters = [
      {
        filterId: 'get_filter_1',
        requestBody: { description: 'Valid filter #1', items: ['104.236.210.185'] },
      },
      {
        filterId: 'get_filter_2',
        requestBody: { description: 'Valid filter #2', items: ['104.236.210.185'] },
      },
    ];

    apiTest.beforeAll(async ({ apiServices }) => {
      for (const { filterId, requestBody } of validFilters) {
        await apiServices.ml.anomalyDetection.filters.delete(filterId);
        await apiServices.ml.anomalyDetection.filters.create(filterId, requestBody);
      }
    });

    apiTest.afterAll(async ({ apiServices }) => {
      for (const { filterId } of validFilters) {
        await apiServices.ml.anomalyDetection.filters.delete(filterId);
      }
    });

    apiTest('should fetch all filters', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();

      const res = await apiClient.get('internal/ml/filters', {
        headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(200);
      const filterIds = (res.body as Array<{ filter_id: string }>).map((f) => f.filter_id);
      for (const { filterId } of validFilters) {
        expect(filterIds).toContain(filterId);
      }
    });

    apiTest(
      'should not allow to retrieve filters for user without required permission',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlViewer();

        const res = await apiClient.get('internal/ml/filters', {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(403);
        expect(res.body.error).toBe('Forbidden');
      }
    );

    apiTest(
      'should not allow to retrieve filters for unauthorized user',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlUnauthorized();

        const res = await apiClient.get('internal/ml/filters', {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(403);
        expect(res.body.error).toBe('Forbidden');
      }
    );

    apiTest('should fetch single filter by id', async ({ apiClient, samlAuth }) => {
      const { filterId, requestBody } = validFilters[0];
      const { cookieHeader } = await samlAuth.asMlPoweruser();

      const res = await apiClient.get(`internal/ml/filters/${filterId}`, {
        headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(200);
      expect(res.body.filter_id).toBe(filterId);
      expect(res.body.description).toBe(requestBody.description);
      expect(res.body.items).toStrictEqual(requestBody.items);
    });

    apiTest('should return 404 if filterId does not exist', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();

      const res = await apiClient.get('internal/ml/filters/filter_id_dne', {
        headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(404);
      expect(res.body.error).toBe('Not Found');
      expect(res.body.message).toContain('resource_not_found_exception');
    });
  }
);
