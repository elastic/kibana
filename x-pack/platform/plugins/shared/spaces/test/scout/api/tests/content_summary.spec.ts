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

const DASHBOARD_API_PATH = '/api/dashboards';
const DASHBOARD_API_VERSION = '2023-10-31';

const A_TEST_SPACE = 'ab-space';
const B_TEST_SPACE = 'ac-space';

const sampleIndexPattern = {
  contentTypeId: 'index-pattern',
  data: {
    fieldAttrs: '{}',
    title: 'index-pattern-1',
    timeFieldName: '@timestamp',
    sourceFilters: '[]',
    fields: '[]',
    fieldFormatMap: '{}',
    typeMeta: '{}',
    runtimeFieldMap: '{}',
    name: 'index-pattern-1',
  },
  options: { id: 'index-pattern-1' },
  version: 1,
};

apiTest.describe(
  'GET /internal/spaces/{spaceId}/content_summary',
  { tag: tags.stateful.all },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      await apiServices.spaces.create({ id: A_TEST_SPACE, name: 'AB Space' });
      await apiServices.spaces.create({ id: B_TEST_SPACE, name: 'AC Space' });
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete(A_TEST_SPACE);
      await apiServices.spaces.delete(B_TEST_SPACE);
    });

    apiTest(`returns content summary for ${A_TEST_SPACE} space`, async ({ apiClient }) => {
      for (let i = 0; i < 2; i++) {
        await apiClient.post(`s/${A_TEST_SPACE}${DASHBOARD_API_PATH}`, {
          headers: {
            ...COMMON_HEADERS,
            ...cookieHeader,
            'elastic-api-version': DASHBOARD_API_VERSION,
          },
          body: { title: 'Sample dashboard' },
        });
      }

      const response = await apiClient.get(`internal/spaces/${A_TEST_SPACE}/content_summary`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(200);
      const { summary, total } = response.body;
      expect(summary).toStrictEqual([
        {
          count: 2,
          type: 'dashboard',
          displayName: 'Dashboard',
          icon: 'dashboardApp',
        },
      ]);
      expect(total).toBe(2);
    });

    apiTest(`returns content summary for ${B_TEST_SPACE} space`, async ({ apiClient }) => {
      await apiClient.post(`s/${B_TEST_SPACE}${DASHBOARD_API_PATH}`, {
        headers: {
          ...COMMON_HEADERS,
          ...cookieHeader,
          'elastic-api-version': DASHBOARD_API_VERSION,
        },
        body: { title: 'Sample dashboard' },
      });

      await apiClient.post(`s/${B_TEST_SPACE}/api/content_management/rpc/create`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: sampleIndexPattern,
      });

      const response = await apiClient.get(`internal/spaces/${B_TEST_SPACE}/content_summary`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(200);
      const { summary, total } = response.body;
      expect(summary).toStrictEqual([
        {
          count: 1,
          type: 'dashboard',
          displayName: 'Dashboard',
          icon: 'dashboardApp',
        },
        {
          count: 1,
          displayName: 'data view',
          icon: 'indexPatternApp',
          type: 'index-pattern',
        },
      ]);
      expect(total).toBe(2);
    });

    apiTest('returns 404 when the space is not found', async ({ apiClient }) => {
      const response = await apiClient.get('internal/spaces/not-found-space/content_summary', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(404);
      expect(response.body).toStrictEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found',
      });
    });
  }
);
