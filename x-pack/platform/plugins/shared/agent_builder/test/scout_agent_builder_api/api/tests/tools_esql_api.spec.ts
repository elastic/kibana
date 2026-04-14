/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER, COMMON_HEADERS } from '../fixtures/constants';

apiTest.describe(
  'Agent Builder — ES|QL tools API',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let adminCredentials: RoleApiCredentials;
    const createdToolIds: string[] = [];
    const mockTool = {
      id: 'cases-tool',
      type: 'esql',
      description: 'A test tool',
      tags: ['test'],
      configuration: {
        query: 'FROM my_cases | WHERE case_id == ?case_id',
        params: { case_id: { type: 'string', description: 'Case ID' } },
      },
    };

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
    });

    apiTest.afterAll(async ({ apiClient }) => {
      for (const toolId of createdToolIds) {
        await apiClient.delete(`${API_AGENT_BUILDER}/tools/${encodeURIComponent(toolId)}`, {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        });
      }
    });

    const h = () => ({ ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader });

    apiTest('POST creates ES|QL tool', async ({ apiClient }) => {
      const response = await apiClient.post(`${API_AGENT_BUILDER}/tools`, {
        headers: h(),
        body: mockTool,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(mockTool.id);
      expect(response.body.configuration.query).toBe(mockTool.configuration.query);
      expect(response.body.configuration.params).toStrictEqual(mockTool.configuration.params);
      createdToolIds.push(mockTool.id);
    });

    apiTest('POST accepts all supported parameter types', async ({ apiClient }) => {
      const toolWithAllParamTypes = {
        id: 'all-param-types-tool',
        type: 'esql',
        description: 'A tool with all parameter types',
        tags: ['test'],
        configuration: {
          query:
            'FROM my_cases | WHERE case_id == ?case_id AND priority >= ?priority AND score >= ?score AND is_active == ?is_active AND @timestamp >= ?since AND owner == ?owners',
          params: {
            case_id: { type: 'string', description: 'Case ID' },
            priority: { type: 'integer', description: 'Priority' },
            score: { type: 'float', description: 'Score' },
            is_active: { type: 'boolean', description: 'Is active' },
            since: { type: 'date', description: 'Since timestamp' },
            owners: { type: 'array', description: 'Owners list' },
          },
        },
      };
      const response = await apiClient.post(`${API_AGENT_BUILDER}/tools`, {
        headers: h(),
        body: toolWithAllParamTypes,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.configuration.params).toStrictEqual(
        toolWithAllParamTypes.configuration.params
      );
      createdToolIds.push(toolWithAllParamTypes.id);
    });

    apiTest('POST validates tool id format', async ({ apiClient }) => {
      const response = await apiClient.post(`${API_AGENT_BUILDER}/tools`, {
        headers: h(),
        body: { ...mockTool, id: 'invalid tool id!' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expect(String(response.body.message)).toContain('Invalid tool id: "invalid tool id!"');
    });

    apiTest('POST requires required fields', async ({ apiClient }) => {
      const response = await apiClient.post(`${API_AGENT_BUILDER}/tools`, {
        headers: h(),
        body: { id: 'incomplete-tool' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('POST validates parameter types', async ({ apiClient }) => {
      const response = await apiClient.post(`${API_AGENT_BUILDER}/tools`, {
        headers: h(),
        body: {
          ...mockTool,
          id: 'invalid-params-tool',
          params: {
            validParam: { type: 'string', description: 'Valid parameter' },
            invalidParam: { type: 'invalid_type', description: 'Invalid parameter' },
          },
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('POST /tools/_execute executes indexed ES|QL tool', async ({ apiClient, esClient }) => {
      const testIndex = 'test-agent-builder-index';
      await esClient.indices.create({
        index: testIndex,
        mappings: {
          properties: {
            name: { type: 'text' },
            age: { type: 'integer' },
            '@timestamp': { type: 'date' },
          },
        },
      });
      await esClient.bulk({
        body: [
          { index: { _index: testIndex } },
          { name: 'Test Case 1', age: 25, '@timestamp': '2023-01-01T00:00:00Z' },
          { index: { _index: testIndex } },
          { name: 'Test Case 2', age: 30, '@timestamp': '2023-01-02T00:00:00Z' },
          { index: { _index: testIndex } },
          { name: 'Test Case 3', age: 35, '@timestamp': '2023-01-03T00:00:00Z' },
        ],
      });
      await esClient.indices.refresh({ index: testIndex });

      const testTool = {
        type: 'esql',
        description: 'A test tool',
        tags: ['test'],
        configuration: {
          query: `FROM ${testIndex} | LIMIT 3`,
          params: {},
        },
        id: 'execute-test-tool',
      };
      await apiClient.post(`${API_AGENT_BUILDER}/tools`, {
        headers: h(),
        body: testTool,
        responseType: 'json',
      });
      createdToolIds.push(testTool.id);

      const executeResponse = await apiClient.post(`${API_AGENT_BUILDER}/tools/_execute`, {
        headers: h(),
        body: { tool_id: 'execute-test-tool', tool_params: {} },
        responseType: 'json',
      });
      expect(executeResponse).toHaveStatusCode(200);
      expect(executeResponse.body).toHaveProperty('results');

      await esClient.indices.delete({ index: testIndex });
    });

    apiTest('GET returns existing ES|QL tool', async ({ apiClient }) => {
      const testTool = { ...mockTool, id: 'get-test-tool' };
      await apiClient.post(`${API_AGENT_BUILDER}/tools`, {
        headers: h(),
        body: testTool,
        responseType: 'json',
      });
      createdToolIds.push(testTool.id);

      const response = await apiClient.get(`${API_AGENT_BUILDER}/tools/get-test-tool`, {
        headers: h(),
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe('get-test-tool');
      expect(response.body.configuration.params).toStrictEqual(mockTool.configuration.params);
    });

    apiTest('GET returns 404 for missing tool', async ({ apiClient }) => {
      const response = await apiClient.get(`${API_AGENT_BUILDER}/tools/non-existent-tool`, {
        headers: h(),
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
      expect(String(response.body.message)).toContain('not found');
    });

    apiTest('GET lists tools', async ({ apiClient }) => {
      for (let i = 0; i < 3; i++) {
        const testTool = { ...mockTool, id: `list-test-tool-${i}` };
        await apiClient.post(`${API_AGENT_BUILDER}/tools`, {
          headers: h(),
          body: testTool,
          responseType: 'json',
        });
        createdToolIds.push(testTool.id);
      }
      const response = await apiClient.get(`${API_AGENT_BUILDER}/tools`, {
        headers: h(),
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.results.length).toBeGreaterThan(1);
    });

    apiTest('PUT updates ES|QL tool', async ({ apiClient }) => {
      const testTool = { ...mockTool, id: 'update-test-tool' };
      await apiClient.post(`${API_AGENT_BUILDER}/tools`, {
        headers: h(),
        body: testTool,
        responseType: 'json',
      });
      createdToolIds.push(testTool.id);

      const response = await apiClient.put(`${API_AGENT_BUILDER}/tools/update-test-tool`, {
        headers: h(),
        body: { description: 'Updated description' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.description).toBe('Updated description');
    });

    apiTest('PUT returns 404 for missing tool', async ({ apiClient }) => {
      const response = await apiClient.put(`${API_AGENT_BUILDER}/tools/non-existent-tool`, {
        headers: h(),
        body: { description: 'Updated description' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
    });

    apiTest('DELETE removes ES|QL tool', async ({ apiClient }) => {
      const testTool = { ...mockTool, id: 'delete-test-tool' };
      await apiClient.post(`${API_AGENT_BUILDER}/tools`, {
        headers: h(),
        body: testTool,
        responseType: 'json',
      });
      createdToolIds.push(testTool.id);
      const del = await apiClient.delete(`${API_AGENT_BUILDER}/tools/delete-test-tool`, {
        headers: h(),
        responseType: 'json',
      });
      expect(del).toHaveStatusCode(200);
      expect(del.body.success).toBe(true);
      const removeIdx = createdToolIds.indexOf('delete-test-tool');
      expect(removeIdx).toBeGreaterThanOrEqual(0);
      createdToolIds.splice(removeIdx, 1);
    });

    apiTest('DELETE missing tool returns expected 404 body', async ({ apiClient }) => {
      const response = await apiClient.delete(`${API_AGENT_BUILDER}/tools/non-existent-tool`, {
        headers: h(),
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
      expect(response.body.message).toBe('Tool non-existent-tool not found');
    });
  }
);
