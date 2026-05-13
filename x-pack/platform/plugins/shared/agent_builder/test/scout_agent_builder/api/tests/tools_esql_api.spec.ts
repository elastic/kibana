/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';

apiTest.describe(
  'Agent Builder — ES|QL tools API',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
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

    apiTest.afterAll(async ({ asAdmin }) => {
      for (const toolId of createdToolIds) {
        await asAdmin.delete(`${API_AGENT_BUILDER}/tools/${encodeURIComponent(toolId)}`);
      }
    });

    apiTest('POST creates ES|QL tool', async ({ asAdmin }) => {
      const response = await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: mockTool,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(mockTool.id);
      expect(response.body.configuration.query).toBe(mockTool.configuration.query);
      expect(response.body.configuration.params).toStrictEqual(mockTool.configuration.params);
      createdToolIds.push(mockTool.id);
    });

    apiTest('POST accepts all supported parameter types', async ({ asAdmin }) => {
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
      const response = await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: toolWithAllParamTypes,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.configuration.params).toStrictEqual(
        toolWithAllParamTypes.configuration.params
      );
      createdToolIds.push(toolWithAllParamTypes.id);
    });

    apiTest('POST validates tool id format', async ({ asAdmin }) => {
      const response = await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: { ...mockTool, id: 'invalid tool id!' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expect(String(response.body.message)).toContain('Invalid tool id: "invalid tool id!"');
    });

    apiTest('POST requires required fields', async ({ asAdmin }) => {
      const response = await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: { id: 'incomplete-tool' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('POST validates parameter types', async ({ asAdmin }) => {
      const response = await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
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

    // Nested suite mirrors FTR lifecycle: index create in beforeAll, delete in afterAll.
    // eslint-disable-next-line playwright/max-nested-describe -- hooks must be scoped to this test only
    apiTest.describe('POST /tools/_execute with indexed ES|QL data', () => {
      const testIndex = 'test-agent-builder-index';

      apiTest.beforeAll(async ({ esClient, asAdmin }) => {
        await esClient.indices.delete({ index: testIndex }, { ignore: [404] });
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
        const createToolResponse = await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
          body: testTool,
          responseType: 'json',
        });
        expect(createToolResponse).toHaveStatusCode(200);
        createdToolIds.push(testTool.id);
      });

      apiTest.afterAll(async ({ esClient }) => {
        try {
          await esClient.indices.delete({ index: testIndex });
        } catch {
          // Index may already be deleted or absent.
        }
      });

      apiTest('POST /tools/_execute executes indexed ES|QL tool', async ({ asAdmin }) => {
        const executeResponse = await asAdmin.post(`${API_AGENT_BUILDER}/tools/_execute`, {
          body: { tool_id: 'execute-test-tool', tool_params: {} },
          responseType: 'json',
        });
        expect(executeResponse).toHaveStatusCode(200);
        expect(executeResponse.body.results).toBeDefined();
      });
    });

    apiTest('GET returns existing ES|QL tool', async ({ asAdmin }) => {
      const testTool = { ...mockTool, id: 'get-test-tool' };
      await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: testTool,
        responseType: 'json',
      });
      createdToolIds.push(testTool.id);

      const response = await asAdmin.get(`${API_AGENT_BUILDER}/tools/get-test-tool`, {
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe('get-test-tool');
      expect(response.body.configuration.params).toStrictEqual(mockTool.configuration.params);
    });

    apiTest('GET returns 404 for missing tool', async ({ asAdmin }) => {
      const response = await asAdmin.get(`${API_AGENT_BUILDER}/tools/non-existent-tool`, {
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
      expect(String(response.body.message)).toContain('not found');
    });

    apiTest('GET lists tools', async ({ asAdmin }) => {
      for (let i = 0; i < 3; i++) {
        const testTool = { ...mockTool, id: `list-test-tool-${i}` };
        await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
          body: testTool,
          responseType: 'json',
        });
        createdToolIds.push(testTool.id);
      }
      const response = await asAdmin.get(`${API_AGENT_BUILDER}/tools`, {
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.results.length).toBeGreaterThan(1);
    });

    apiTest('PUT updates ES|QL tool', async ({ asAdmin }) => {
      const testTool = { ...mockTool, id: 'update-test-tool' };
      await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: testTool,
        responseType: 'json',
      });
      createdToolIds.push(testTool.id);

      const response = await asAdmin.put(`${API_AGENT_BUILDER}/tools/update-test-tool`, {
        body: { description: 'Updated description' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.description).toBe('Updated description');
    });

    apiTest('PUT returns 404 for missing tool', async ({ asAdmin }) => {
      const response = await asAdmin.put(`${API_AGENT_BUILDER}/tools/non-existent-tool`, {
        body: { description: 'Updated description' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
    });

    apiTest('DELETE removes ES|QL tool', async ({ asAdmin }) => {
      const testTool = { ...mockTool, id: 'delete-test-tool' };
      await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: testTool,
        responseType: 'json',
      });
      createdToolIds.push(testTool.id);
      const del = await asAdmin.delete(`${API_AGENT_BUILDER}/tools/delete-test-tool`, {
        responseType: 'json',
      });
      expect(del).toHaveStatusCode(200);
      expect(del.body.success).toBe(true);
      const removeIdx = createdToolIds.indexOf('delete-test-tool');
      // eslint-disable-next-line playwright/prefer-comparison-matcher
      expect(removeIdx >= 0).toBe(true);
      createdToolIds.splice(removeIdx, 1);
    });

    apiTest('DELETE missing tool returns expected 404 body', async ({ asAdmin }) => {
      const response = await asAdmin.delete(`${API_AGENT_BUILDER}/tools/non-existent-tool`, {
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
      expect(response.body.message).toBe('Tool non-existent-tool not found');
    });
  }
);
