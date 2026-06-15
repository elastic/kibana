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
  'delete_filters',
  {
    tag: [
      '@local-stateful-classic',
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    const validFilters: estypes.MlFilter[] = [
      { filter_id: 'delete_filter_power', description: 'Test delete filter #1', items: ['104.236.210.185'] },
      { filter_id: 'delete_filter_viewer', description: 'Test delete filter (viewer)', items: ['104.236.210.185'] },
      { filter_id: 'delete_filter_unauthorized', description: 'Test delete filter (unauthorized)', items: ['104.236.210.185'] },
    ];

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

    apiTest('should delete filter by id', async ({ apiClient, samlAuth }) => {
      const { filter_id: filterId } = validFilters[0];
      const { cookieHeader } = await samlAuth.asMlPoweruser();

      const res = await apiClient.delete(`internal/ml/filters/${filterId}`, {
        headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(200);
      expect(res.body.acknowledged).toBe(true);

      // Verify filter is actually gone
      const getRes = await apiClient.get(`internal/ml/filters/${filterId}`, {
        headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(getRes).toHaveStatusCode(404);
    });

    apiTest(
      'should not delete filter for user without required permission',
      async ({ apiClient, samlAuth }) => {
        const { filter_id: filterId } = validFilters[1];
        const { cookieHeader: viewerCookie } = await samlAuth.asMlViewer();

        const res = await apiClient.delete(`internal/ml/filters/${filterId}`, {
          headers: { ...INTERNAL_API_HEADERS, ...viewerCookie },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(403);
        expect(res.body.error).toBe('Forbidden');

        // Verify filter still exists via the Kibana endpoint
        const { cookieHeader: poweruserCookie } = await samlAuth.asMlPoweruser();
        const getRes = await apiClient.get(`internal/ml/filters/${filterId}`, {
          headers: { ...INTERNAL_API_HEADERS, ...poweruserCookie },
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);
        expect(getRes.body.filter_id).toBe(filterId);
      }
    );

    apiTest('should not delete filter for unauthorized user', async ({ apiClient, samlAuth }) => {
      const { filter_id: filterId } = validFilters[2];
      const { cookieHeader: unauthorizedCookie } = await samlAuth.asMlUnauthorized();

      const res = await apiClient.delete(`internal/ml/filters/${filterId}`, {
        headers: { ...INTERNAL_API_HEADERS, ...unauthorizedCookie },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(403);
      expect(res.body.error).toBe('Forbidden');

      // Verify filter still exists via the Kibana endpoint
      const { cookieHeader: poweruserCookie } = await samlAuth.asMlPoweruser();
      const getRes = await apiClient.get(`internal/ml/filters/${filterId}`, {
        headers: { ...INTERNAL_API_HEADERS, ...poweruserCookie },
        responseType: 'json',
      });
      expect(getRes).toHaveStatusCode(200);
      expect(getRes.body.filter_id).toBe(filterId);
    });

    apiTest(
      'should not allow user to delete filter if invalid filterId',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();

        const res = await apiClient.delete('internal/ml/filters/filter_id_dne', {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(404);
        expect(res.body.error).toBe('Not Found');
      }
    );
  }
);
