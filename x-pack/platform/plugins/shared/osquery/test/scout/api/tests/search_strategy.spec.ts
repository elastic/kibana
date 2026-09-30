/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole, RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const LIMITED_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [],
  },
  kibana: [
    {
      base: [],
      feature: {
        advancedSettings: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

const READER_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [],
  },
  kibana: [
    {
      base: [],
      feature: {
        osquery: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

const INTERNAL_SEARCH_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
  'elastic-api-version': '1',
} as const;

const ACTION_RESULTS_PATH = 'api/osquery/action_results/scout-missing-action';

apiTest.describe(
  'Osquery search strategy',
  { tag: ['@local-stateful-classic', '@local-serverless-security_complete'] },
  () => {
    let interactiveCookieHeader: Record<string, string>;
    let limitedCredentials: RoleApiCredentials;
    let readerCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, samlAuth }) => {
      ({ cookieHeader: interactiveCookieHeader } = await samlAuth.asInteractiveUser('viewer'));
      limitedCredentials = await requestAuth.getApiKeyForCustomRole(LIMITED_ROLE);
      readerCredentials = await requestAuth.getApiKeyForCustomRole(READER_ROLE);
    });

    apiTest('handles the legacy strategy identifier', async ({ apiClient }) => {
      const response = await apiClient.post('internal/search/osquerySearchStrategy', {
        headers: {
          ...INTERNAL_SEARCH_HEADERS,
          ...interactiveCookieHeader,
        },
        body: {
          factoryQueryType: 'actionResults',
          actionId: 'scout-missing-action',
          pagination: {
            activePage: 0,
            querySize: 1,
          },
          sort: {
            field: '@timestamp',
            direction: 'desc',
          },
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(404);
      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Search strategy osquerySearchStrategy not found',
      });
    });

    apiTest('handles action results for a limited role', async ({ apiClient }) => {
      const response = await apiClient.get(ACTION_RESULTS_PATH, {
        headers: {
          ...testData.COMMON_HEADERS,
          ...limitedCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body).toMatchObject({
        statusCode: 403,
      });
    });

    apiTest('returns action results for a reader', async ({ apiClient }) => {
      const response = await apiClient.get(ACTION_RESULTS_PATH, {
        headers: {
          ...testData.COMMON_HEADERS,
          ...readerCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({
        edges: [],
        total: 0,
      });
    });
  }
);
