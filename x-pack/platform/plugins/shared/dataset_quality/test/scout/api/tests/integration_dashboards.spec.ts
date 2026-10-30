/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { v4 as uuid } from 'uuid';

import type { Dashboard, IntegrationDashboardsResponse } from '../../../../common/api_types';
import { apiTest, testData } from '../fixtures';
import { PACKAGES, cleanUpAll } from '../../common';

/**
 * Suffixed per run and prefixed per spec: the FTR suite used a fixed
 * `my.custom.integration`, which collides with anything another suite leaks.
 */
const CUSTOM_INTEGRATION_NAME = `dq.api.dashboards-${uuid()}`;

/**
 * Every dashboard shipped by the pinned nginx package, in the order the route returns
 * them. Exhaustive on purpose: the version is pinned, so an extra or missing entry is a
 * defect in the route rather than a package that moved on.
 */
const EXPECTED_NGINX_DASHBOARDS: Dashboard[] = [
  { id: 'nginx-023d2930-f1a5-11e7-a9ef-93c69af7b129', title: '[Metrics Nginx] Overview' },
  {
    id: 'nginx-046212a0-a2a1-11e7-928f-5dbe6f6f5519',
    title: '[Logs Nginx] Access and error logs',
  },
  { id: 'nginx-55a9e6e0-a29e-11e7-928f-5dbe6f6f5519', title: '[Logs Nginx] Overview' },
];

apiTest.describe(
  'Dataset quality - integration dashboards',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await Promise.all([
        apiServices.fleet.integration.installPackage(PACKAGES.nginx.name, PACKAGES.nginx.version),
        apiServices.fleet.integration.installPackage(PACKAGES.apache.name, PACKAGES.apache.version),
        // A custom integration never ships dashboards, which is exactly what the
        // "integration without dashboards" case needs.
        apiServices.fleet.integration.install(CUSTOM_INTEGRATION_NAME),
      ]);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await cleanUpAll([
        () => apiServices.fleet.integration.delete(PACKAGES.nginx.name),
        () => apiServices.fleet.integration.delete(PACKAGES.apache.name),
        () => apiServices.fleet.integration.delete(CUSTOM_INTEGRATION_NAME),
      ]);
    });

    apiTest('returns a non-empty body', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.get(
        testData.API.integrationDashboards(PACKAGES.nginx.name),
        {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      const { dashboards }: IntegrationDashboardsResponse = response.body;
      expect(dashboards.length).toBeGreaterThan(0);
    });

    apiTest(
      'returns the dashboards of an installed integration',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(
          testData.API.integrationDashboards(PACKAGES.apache.name),
          {
            headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        const { dashboards }: IntegrationDashboardsResponse = response.body;

        // Exact count: the apache package is installed at a pinned version, so the set
        // of dashboards it ships cannot drift underneath this assertion.
        expect(dashboards).toHaveLength(2);
        for (const dashboard of dashboards) {
          expect(Object.keys(dashboard).sort()).toStrictEqual(['id', 'title']);
          expect(typeof dashboard.id).toBe('string');
          expect(typeof dashboard.title).toBe('string');
        }
      }
    );

    apiTest(
      'returns a list of dashboards in the correct format',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(
          testData.API.integrationDashboards(PACKAGES.nginx.name),
          {
            headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        const { dashboards }: IntegrationDashboardsResponse = response.body;

        // Whole-array equality: nginx is installed at a pinned version, so extra or
        // missing dashboards mean the route is wrong, not that the package changed.
        expect(dashboards).toStrictEqual(EXPECTED_NGINX_DASHBOARDS);
      }
    );

    apiTest(
      'returns an empty array for an integration without dashboards',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(
          testData.API.integrationDashboards(CUSTOM_INTEGRATION_NAME),
          {
            headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({ dashboards: [] });
      }
    );

    apiTest(
      'returns an empty array for an invalid integration',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(testData.API.integrationDashboards('invalid'), {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({ dashboards: [] });
      }
    );
  }
);
