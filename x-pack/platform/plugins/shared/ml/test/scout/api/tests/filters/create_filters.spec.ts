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
  'create_filters',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    const testFilterIds: string[] = [];

    apiTest.afterAll(async ({ apiServices }) => {
      for (const filterId of testFilterIds) {
        await apiServices.ml.anomalyDetection.filters.delete(filterId);
      }
    });

    apiTest('should successfully create new filter', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();
      const requestBody = {
        filterId: 'safe_ip_addresses',
        description: '',
        items: ['104.236.210.185'],
      };

      const res = await apiClient.put('internal/ml/filters', {
        headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        body: requestBody,
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(200);
      testFilterIds.push(requestBody.filterId);
      expect(res.body).toStrictEqual({
        filter_id: 'safe_ip_addresses',
        description: '',
        items: ['104.236.210.185'],
      });
    });

    apiTest(
      'should not create new filter for user without required permission',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlViewer();
        const requestBody = {
          filterId: 'safe_ip_addresses_view_only',
          description: '',
          items: ['104.236.210.185'],
        };

        const res = await apiClient.put('internal/ml/filters', {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          body: requestBody,
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(403);
        expect(res.body.error).toBe('Forbidden');
        expect(res.body.message).toContain('ml:canCreateFilter');
      }
    );

    apiTest(
      'should not create new filter for unauthorized user',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlUnauthorized();
        const requestBody = {
          filterId: 'safe_ip_addresses_unauthorized',
          description: '',
          items: ['104.236.210.185'],
        };

        const res = await apiClient.put('internal/ml/filters', {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          body: requestBody,
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(403);
        expect(res.body.error).toBe('Forbidden');
        expect(res.body.message).toContain('ml:canCreateFilter');
      }
    );

    apiTest(
      'should return 400 bad request if invalid filterId',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asMlPoweruser();
        const requestBody = {
          filterId: '@invalid_filter_id',
          description: '',
          items: ['104.236.210.185'],
        };

        const res = await apiClient.put('internal/ml/filters', {
          headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
          body: requestBody,
          responseType: 'json',
        });

        expect(res).toHaveStatusCode(400);
        expect(res.body.error).toBe('Bad Request');
        expect(res.body.message).toContain('status_exception');
      }
    );

    apiTest('should return 400 bad request if invalid items', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asMlPoweruser();
      const requestBody = { filterId: 'valid_filter', description: '' };

      const res = await apiClient.put('internal/ml/filters', {
        headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
        body: requestBody,
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(400);
      expect(res.body.error).toBe('Bad Request');
      expect(res.body.message).toContain('expected value of type [array] but got [undefined]');
    });
  }
);
