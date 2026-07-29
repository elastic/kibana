/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { ALERTING_V2_INTERNAL_SUGGESTIONS_MATCHER_VALUES_API_PATH } from '@kbn/alerting-v2-constants';
import { apiTest, testData } from '../fixtures';

apiTest.describe('Matcher value suggestions API', { tag: '@local-stateful-classic' }, () => {
  let adminCredentials: RoleApiCredentials;
  let adminHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();
    // This is an internal API reached over POST, so the request needs the
    // shared XSRF / internal-origin headers alongside the API key; without
    // them Kibana rejects the request with a 400 before it hits validation.
    adminHeaders = { ...testData.COMMON_HEADERS, ...adminCredentials.apiKeyHeader };
  });

  apiTest(
    'returns a 200 with an array of suggested values for a static field',
    async ({ apiClient }) => {
      // `episode_status` is backed by static suggestions, so the result is
      // deterministic without seeding any alert events or rules.
      const response = await apiClient.post(
        ALERTING_V2_INTERNAL_SUGGESTIONS_MATCHER_VALUES_API_PATH,
        {
          headers: adminHeaders,
          body: {
            field: 'episode_status',
            query: '',
          },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual(
        expect.arrayContaining(['inactive', 'pending', 'active', 'recovering'])
      );
    }
  );

  apiTest(
    'validation: rejects body with unknown top-level keys (strict schema)',
    async ({ apiClient }) => {
      const response = await apiClient.post(
        ALERTING_V2_INTERNAL_SUGGESTIONS_MATCHER_VALUES_API_PATH,
        {
          headers: adminHeaders,
          body: {
            field: 'rule.name',
            query: 'test',
            unknownField: 'x',
          },
        }
      );

      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest(
    'validation: accepts fieldMeta and filters sent by the KQL value suggestion provider',
    async ({ apiClient }) => {
      const response = await apiClient.post(
        ALERTING_V2_INTERNAL_SUGGESTIONS_MATCHER_VALUES_API_PATH,
        {
          headers: adminHeaders,
          body: {
            field: 'rule.name',
            query: 'test',
            fieldMeta: { name: 'rule.name', type: 'string' },
            filters: [],
          },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body)).toBe(true);
    }
  );
});
