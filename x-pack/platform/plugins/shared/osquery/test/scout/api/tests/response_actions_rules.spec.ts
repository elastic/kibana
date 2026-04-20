/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

apiTest.describe(
  'Detection rules with Osquery response actions',
  { tag: [...tags.stateful.all, ...tags.serverless.security.complete] },
  () => {
    let credentials: RoleApiCredentials;
    let packSavedObjectId: string;
    const createdRuleIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      credentials = await requestAuth.getApiKeyForPrivilegedUser();

      const packResponse = await apiServices.osquery.packs.create(
        testData.getMinimalPack({
          name: `ra-pack-${Date.now()}`,
          queries: {
            memoryInfo: {
              query: 'SELECT * FROM memory_info;',
              interval: 3600,
              platform: 'linux',
            },
            systemInfo: {
              query: 'SELECT * FROM system_info;',
              interval: 3600,
            },
          },
        })
      );
      packSavedObjectId = (packResponse.data as Record<string, Record<string, string>>).data
        .saved_object_id;
    });

    apiTest.afterAll(async ({ apiServices, kbnClient }) => {
      for (const ruleId of createdRuleIds) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/detection_engine/rules?id=${ruleId}`,
          headers: { 'elastic-api-version': testData.OSQUERY_API_VERSION },
          ignoreErrors: [404],
        });
      }

      if (packSavedObjectId) {
        await apiServices.osquery.packs.delete(packSavedObjectId);
      }
    });

    apiTest('creates a rule with a single Osquery query action', async ({ apiClient }) => {
      const ruleBody = testData.getMinimalRule({
        response_actions: [
          {
            action_type_id: '.osquery',
            params: { query: 'select * from uptime;' },
          },
        ],
      });

      const createResponse = await apiClient.post(testData.API_PATHS.DETECTION_RULES, {
        headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
        body: ruleBody,
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body).toBeDefined();
      createdRuleIds.push(createResponse.body.id);

      expect(createResponse.body.response_actions).toHaveLength(1);
      expect(createResponse.body.response_actions[0]).toMatchObject({
        action_type_id: '.osquery',
        params: expect.objectContaining({ query: 'select * from uptime;' }),
      });

      const getResponse = await apiClient.get(
        `${testData.API_PATHS.DETECTION_RULES}?id=${createResponse.body.id}`,
        {
          headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body).toBeDefined();
      expect(getResponse.body.response_actions).toHaveLength(1);
      expect(getResponse.body.response_actions[0].params.query).toBe('select * from uptime;');
    });

    apiTest(
      'creates a rule with full Osquery params including ecs_mapping and timeout',
      async ({ apiClient }) => {
        const ruleBody = testData.getMinimalRule({
          response_actions: [
            {
              action_type_id: '.osquery',
              params: {
                query: 'select * from os_version;',
                ecs_mapping: { 'host.os.name': { field: 'name' } },
                timeout: 120,
              },
            },
          ],
        });

        const createResponse = await apiClient.post(testData.API_PATHS.DETECTION_RULES, {
          headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
          body: ruleBody,
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        expect(createResponse.body).toBeDefined();
        createdRuleIds.push(createResponse.body.id);

        const { params } = createResponse.body.response_actions[0];
        expect(params.query).toBe('select * from os_version;');
        expect(params.ecs_mapping).toStrictEqual({ 'host.os.name': { field: 'name' } });
        expect(params.timeout).toBe(120);
      }
    );

    apiTest('creates a rule with pack-based Osquery action', async ({ apiClient }) => {
      const ruleBody = testData.getMinimalRule({
        response_actions: [
          {
            action_type_id: '.osquery',
            params: {
              pack_id: packSavedObjectId,
              queries: [
                {
                  id: 'memoryInfo',
                  query: 'SELECT * FROM memory_info;',
                  interval: 3600,
                  platform: 'linux',
                },
                {
                  id: 'systemInfo',
                  query: 'SELECT * FROM system_info;',
                  interval: 3600,
                },
              ],
            },
          },
        ],
      });

      const createResponse = await apiClient.post(testData.API_PATHS.DETECTION_RULES, {
        headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
        body: ruleBody,
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body).toBeDefined();
      createdRuleIds.push(createResponse.body.id);

      const { params } = createResponse.body.response_actions[0];
      expect(params.pack_id).toBe(packSavedObjectId);
      expect(params.queries).toHaveLength(2);
    });

    apiTest('updates a rule to add Osquery response actions', async ({ apiClient }) => {
      const ruleBody = testData.getMinimalRule();
      const createResponse = await apiClient.post(testData.API_PATHS.DETECTION_RULES, {
        headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
        body: ruleBody,
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body).toBeDefined();
      createdRuleIds.push(createResponse.body.id);

      const updateResponse = await apiClient.put(testData.API_PATHS.DETECTION_RULES, {
        headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
        body: {
          ...ruleBody,
          id: createResponse.body.id,
          response_actions: [
            {
              action_type_id: '.osquery',
              params: { query: 'select * from uptime;' },
            },
          ],
        },
        responseType: 'json',
      });
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body.response_actions).toHaveLength(1);

      const getResponse = await apiClient.get(
        `${testData.API_PATHS.DETECTION_RULES}?id=${createResponse.body.id}`,
        {
          headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body).toBeDefined();
      expect(getResponse.body.response_actions).toHaveLength(1);
    });

    apiTest('updates a rule to remove Osquery response actions', async ({ apiClient }) => {
      const ruleBody = testData.getMinimalRule({
        response_actions: [
          {
            action_type_id: '.osquery',
            params: { query: 'select * from uptime;' },
          },
        ],
      });
      const createResponse = await apiClient.post(testData.API_PATHS.DETECTION_RULES, {
        headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
        body: ruleBody,
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body).toBeDefined();
      createdRuleIds.push(createResponse.body.id);
      expect(createResponse.body.response_actions).toHaveLength(1);

      const updateResponse = await apiClient.put(testData.API_PATHS.DETECTION_RULES, {
        headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
        body: {
          ...ruleBody,
          id: createResponse.body.id,
          response_actions: [],
        },
        responseType: 'json',
      });
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body.response_actions).toHaveLength(0);
    });

    apiTest(
      'creates a rule with multiple Osquery actions of different types',
      async ({ apiClient }) => {
        const ruleBody = testData.getMinimalRule({
          response_actions: [
            {
              action_type_id: '.osquery',
              params: { query: 'select * from uptime;' },
            },
            {
              action_type_id: '.osquery',
              params: {
                pack_id: packSavedObjectId,
                queries: [
                  {
                    id: 'memoryInfo',
                    query: 'SELECT * FROM memory_info;',
                    interval: 3600,
                  },
                ],
              },
            },
            {
              action_type_id: '.osquery',
              params: {
                query: 'select * from os_version;',
                ecs_mapping: { 'host.os.platform': { field: 'platform' } },
                timeout: 300,
              },
            },
          ],
        });

        const createResponse = await apiClient.post(testData.API_PATHS.DETECTION_RULES, {
          headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
          body: ruleBody,
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        expect(createResponse.body).toBeDefined();
        createdRuleIds.push(createResponse.body.id);

        const actions = createResponse.body.response_actions;
        expect(actions).toHaveLength(3);
        expect(actions[0].params.query).toBe('select * from uptime;');
        expect(actions[1].params.pack_id).toBe(packSavedObjectId);
        expect(actions[2].params.ecs_mapping).toStrictEqual({
          'host.os.platform': { field: 'platform' },
        });
      }
    );
  }
);
