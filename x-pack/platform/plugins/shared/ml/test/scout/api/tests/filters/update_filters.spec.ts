/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';

// TODO: Add the ECH cloud tag once support for custom roles is implemented.
// See related issue: https://github.com/elastic/kibana/issues/259284
apiTest.describe(
  'update_filters',
  {
    tag: [
      '@local-stateful-classic',
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    const validFilters: estypes.MlFilter[] = [
      {
        filter_id: 'update_filter_power',
        description: 'Test update filter #1',
        items: ['104.236.210.185'],
      },
      {
        filter_id: 'update_filter_viewer',
        description: 'Test update filter (viewer)',
        items: ['104.236.210.185'],
      },
      {
        filter_id: 'update_filter_unauthorized',
        description: 'Test update filter (unauthorized)',
        items: ['104.236.210.185'],
      },
    ];

    const updateFilterRequestBody = {
      description: 'Updated filter #1',
      removeItems: ['104.236.210.185'],
      addItems: ['my_new_items_1', 'my_new_items_2'],
    };

    apiTest.beforeAll(async ({ apiServices }) => {
      for (const filter of validFilters) {
        await apiServices.ml.anomalyDetection.filters.delete(filter.filter_id);
        await apiServices.ml.anomalyDetection.filters.create(filter);
      }
    });

    apiTest.afterAll(async ({ apiServices }) => {
      for (const { filter_id } of validFilters) {
        await apiServices.ml.anomalyDetection.filters.delete(filter_id);
      }
    });

    apiTest('should update filter by id', async ({ apiClient, samlAuth }) => {
      const { filter_id: filterId } = validFilters[0];
      const { cookieHeader } = await samlAuth.asMlPoweruser();

      const res = await apiClient.put(`internal/ml/filters/${filterId}`, {
        headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        body: updateFilterRequestBody,
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(200);
      expect(res.body.filter_id).toBe(filterId);
      expect(res.body.description).toBe(updateFilterRequestBody.description);
      expect(res.body.items).toStrictEqual(updateFilterRequestBody.addItems);
    });

    apiTest(
      'should not allow to update filter for user without required permission',
      async ({ apiClient, samlAuth }) => {
        const { filter_id, description, items } = validFilters[1];
        const { cookieHeader: viewerCookie } = await samlAuth.asMlViewer();

        const res = await apiClient.put(`internal/ml/filters/${filter_id}`, {
          headers: { ...INTERNAL_API_HEADERS, ...viewerCookie },
          body: updateFilterRequestBody,
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(403);
        expect(res.body.error).toBe('Forbidden');

        // Verify filter was not updated via the Kibana endpoint
        const { cookieHeader: poweruserCookie } = await samlAuth.asMlPoweruser();
        const getRes = await apiClient.get(`internal/ml/filters/${filter_id}`, {
          headers: { ...INTERNAL_API_HEADERS, ...poweruserCookie },
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);
        expect(getRes.body.filter_id).toBe(filter_id);
        expect(getRes.body.description).toBe(description);
        expect(getRes.body.items).toStrictEqual(items);
      }
    );

    apiTest(
      'should not allow to update filter for unauthorized user',
      async ({ apiClient, samlAuth }) => {
        const { filter_id, description, items } = validFilters[2];
        const { cookieHeader: unauthorizedCookie } = await samlAuth.asMlUnauthorized();

        const res = await apiClient.put(`internal/ml/filters/${filter_id}`, {
          headers: { ...INTERNAL_API_HEADERS, ...unauthorizedCookie },
          body: updateFilterRequestBody,
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(403);
        expect(res.body.error).toBe('Forbidden');

        // Verify filter was not updated via the Kibana endpoint
        const { cookieHeader: poweruserCookie } = await samlAuth.asMlPoweruser();
        const getRes = await apiClient.get(`internal/ml/filters/${filter_id}`, {
          headers: { ...INTERNAL_API_HEADERS, ...poweruserCookie },
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);
        expect(getRes.body.filter_id).toBe(filter_id);
        expect(getRes.body.description).toBe(description);
        expect(getRes.body.items).toStrictEqual(items);
      }
    );

    apiTest(
      'should return appropriate error if invalid filterId',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        const res = await apiClient.put('internal/ml/filters/filter_id_dne', {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          body: updateFilterRequestBody,
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(404);
        expect(res.body.message).toContain('resource_not_found_exception');
      }
    );
  }
);
