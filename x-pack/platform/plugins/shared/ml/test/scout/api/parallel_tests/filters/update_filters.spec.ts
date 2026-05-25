/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, INTERNAL_API_HEADERS } from '../../fixtures';

apiTest.describe(
  'update_filters',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    const items = ['104.236.210.185'];
    const validFilters = [
      {
        filterId: 'update_filter_power',
        requestBody: { description: 'Test update filter #1', items },
      },
      {
        filterId: 'update_filter_viewer',
        requestBody: { description: 'Test update filter (viewer)', items },
      },
      {
        filterId: 'update_filter_unauthorized',
        requestBody: { description: 'Test update filter (unauthorized)', items },
      },
    ];

    const updateFilterRequestBody = {
      description: 'Updated filter #1',
      removeItems: items,
      addItems: ['my_new_items_1', 'my_new_items_2'],
    };

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

    apiTest('should update filter by id', async ({ apiClient, samlAuth }) => {
      const { filterId } = validFilters[0];
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
        const { filterId, requestBody: oldFilterRequest } = validFilters[1];
        const { cookieHeader: viewerCookie } = await samlAuth.asMlViewer();

        const res = await apiClient.put(`internal/ml/filters/${filterId}`, {
          headers: { ...INTERNAL_API_HEADERS, ...viewerCookie },
          body: updateFilterRequestBody,
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(403);
        expect(res.body.error).toBe('Forbidden');

        // Verify filter was not updated via the Kibana endpoint
        const { cookieHeader: poweruserCookie } = await samlAuth.asMlPoweruser();
        const getRes = await apiClient.get(`internal/ml/filters/${filterId}`, {
          headers: { ...INTERNAL_API_HEADERS, ...poweruserCookie },
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);
        expect(getRes.body.filter_id).toBe(filterId);
        expect(getRes.body.description).toBe(oldFilterRequest.description);
        expect(getRes.body.items).toStrictEqual(oldFilterRequest.items);
      }
    );

    apiTest(
      'should not allow to update filter for unauthorized user',
      async ({ apiClient, samlAuth }) => {
        const { filterId, requestBody: oldFilterRequest } = validFilters[2];
        const { cookieHeader: unauthorizedCookie } = await samlAuth.asMlUnauthorized();

        const res = await apiClient.put(`internal/ml/filters/${filterId}`, {
          headers: { ...INTERNAL_API_HEADERS, ...unauthorizedCookie },
          body: updateFilterRequestBody,
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(403);
        expect(res.body.error).toBe('Forbidden');

        // Verify filter was not updated via the Kibana endpoint
        const { cookieHeader: poweruserCookie } = await samlAuth.asMlPoweruser();
        const getRes = await apiClient.get(`internal/ml/filters/${filterId}`, {
          headers: { ...INTERNAL_API_HEADERS, ...poweruserCookie },
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);
        expect(getRes.body.filter_id).toBe(filterId);
        expect(getRes.body.description).toBe(oldFilterRequest.description);
        expect(getRes.body.items).toStrictEqual(oldFilterRequest.items);
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
