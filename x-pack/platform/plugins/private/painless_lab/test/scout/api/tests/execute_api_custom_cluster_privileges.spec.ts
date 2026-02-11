/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS, TEST_INPUT } from '../fixtures/constants';

apiTest.describe(
  'POST api/painless_lab/execute with specific cluster privileges',
  { tag: tags.ESS_ONLY },
  () => {
    apiTest(
      'should execute a valid painless script using cluster:admin/scripts/painless/execute credentials',
      async ({ apiClient, requestAuth }) => {
        const adminPainlessExecuteClusterPrivilegesCredentials =
          await requestAuth.getApiKeyForCustomRole({
            cluster: ['cluster:admin/scripts/painless/execute'],
          });

        const response = await apiClient.post('api/painless_lab/execute', {
          headers: {
            ...COMMON_HEADERS,
            ...adminPainlessExecuteClusterPrivilegesCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: TEST_INPUT.script,
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({
          result: 'true',
        });
      }
    );

    apiTest(
      'should execute a valid painless script using cluster:admin credentials',
      async ({ apiClient, requestAuth }) => {
        const adminClusterPrivilegesCredentials = await requestAuth.getApiKeyForCustomRole({
          cluster: ['cluster:admin'],
        });

        const response = await apiClient.post('api/painless_lab/execute', {
          headers: {
            ...COMMON_HEADERS,
            ...adminClusterPrivilegesCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: TEST_INPUT.script,
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({
          result: 'true',
        });
      }
    );

    apiTest(
      'should return an unauthorized status code when using monitor cluster credentials',
      async ({ apiClient, requestAuth }) => {
        const monitorClusterPrivilegesCredentials = await requestAuth.getApiKeyForCustomRole({
          cluster: ['monitor'],
        });

        const response = await apiClient.post('api/painless_lab/execute', {
          headers: {
            ...COMMON_HEADERS,
            ...monitorClusterPrivilegesCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: TEST_INPUT.script,
        });
        expect(response.body.status).toBe(403);
      }
    );

    apiTest(
      'should return an unauthorized status code when using both cluster and Kibana privileges',
      async ({ apiClient, requestAuth }) => {
        const monitorClusterPrivilegesCredentials = await requestAuth.getApiKeyForCustomRole({
          elasticsearch: { cluster: ['cluster:admin/scripts/painless/execute'] },
          kibana: [{ base: [], feature: { dev_tools: ['all'] }, spaces: ['*'] }],
        });

        const response = await apiClient.post('api/painless_lab/execute', {
          headers: {
            ...COMMON_HEADERS,
            ...monitorClusterPrivilegesCredentials.apiKeyHeader,
          },
          responseType: 'json',
          body: TEST_INPUT.script,
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({
          result: 'true',
        });
      }
    );
  }
);
