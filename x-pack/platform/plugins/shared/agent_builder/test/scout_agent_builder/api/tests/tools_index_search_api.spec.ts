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
  'Agent Builder — index search tools API',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    const createdToolIds: string[] = [];
    const testIndex = 'test-search-agent-builder-index';
    const mockTool = {
      id: 'search-tool',
      type: 'index_search',
      description: 'A test search tool',
      tags: ['test', 'search'],
      configuration: {
        pattern: testIndex,
        row_limit: 100,
        custom_instructions: 'Search test data',
      },
    };

    apiTest.beforeAll(async ({ esClient }) => {
      await esClient.indices.create({ index: testIndex });
    });

    apiTest.afterAll(async ({ asAdmin, esClient }) => {
      for (const toolId of createdToolIds) {
        await asAdmin.delete(`${API_AGENT_BUILDER}/tools/${encodeURIComponent(toolId)}`);
      }
      await esClient.indices.delete({ index: testIndex });
    });

    apiTest('POST creates index search tool', async ({ asAdmin }) => {
      const response = await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: mockTool,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(mockTool.id);
      expect(response.body.configuration.pattern).toBe(testIndex);
      createdToolIds.push(mockTool.id);
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

    apiTest('POST requires pattern in configuration', async ({ asAdmin }) => {
      const response = await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: {
          ...mockTool,
          id: 'no-pattern-tool',
          configuration: { row_limit: 100 },
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('POST validates index pattern exists', async ({ asAdmin }) => {
      const response = await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: {
          ...mockTool,
          id: 'invalid-pattern-tool',
          configuration: {
            ...mockTool.configuration,
            pattern: 'non-existent-index-pattern-that-definitely-does-not-exist-12345',
          },
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('POST validates row_limit is numeric', async ({ asAdmin }) => {
      const response = await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: {
          ...mockTool,
          id: 'invalid-row-limit-tool-type',
          configuration: { ...mockTool.configuration, row_limit: 'not a number' },
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('POST validates row_limit minimum', async ({ asAdmin }) => {
      const response = await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: {
          ...mockTool,
          id: 'invalid-row-limit-tool-negative',
          configuration: { ...mockTool.configuration, row_limit: -1 },
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('GET retrieves index search tool', async ({ asAdmin }) => {
      const testTool = { ...mockTool, id: 'get-search-test-tool' };
      await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: testTool,
        responseType: 'json',
      });
      createdToolIds.push(testTool.id);

      const response = await asAdmin.get(`${API_AGENT_BUILDER}/tools/get-search-test-tool`, {
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe('get-search-test-tool');
      expect(response.body.configuration.row_limit).toBe(100);
    });

    apiTest('GET returns 404 for missing tool', async ({ asAdmin }) => {
      const response = await asAdmin.get(`${API_AGENT_BUILDER}/tools/non-existent-search-tool`, {
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
      expect(String(response.body.message)).toContain('not found');
    });

    apiTest('GET lists includes index search tools', async ({ asAdmin }) => {
      for (let i = 0; i < 3; i++) {
        const testTool = {
          ...mockTool,
          id: `list-search-test-tool-${i}`,
          configuration: { pattern: testIndex, row_limit: 50 },
        };
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
      const indexSearchTools = response.body.results.filter(
        (tool: { type: string }) => tool.type === 'index_search'
      );
      expect(indexSearchTools.length).toBeGreaterThan(0);
    });

    // Nested suite mirrors FTR `describe('PUT ...')` + `before` (shared POST for update-search-test-tool).
    // eslint-disable-next-line playwright/max-nested-describe -- hooks scoped to PUT update tests only
    apiTest.describe('PUT updates', () => {
      apiTest.beforeAll(async ({ asAdmin }) => {
        const testTool = { ...mockTool, id: 'update-search-test-tool' };
        const createResponse = await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
          body: testTool,
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        createdToolIds.push(testTool.id);
      });

      apiTest('PUT updates description', async ({ asAdmin }) => {
        const response = await asAdmin.put(`${API_AGENT_BUILDER}/tools/update-search-test-tool`, {
          body: { description: 'Updated search description' },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body.description).toBe('Updated search description');
      });

      apiTest('PUT updates configuration', async ({ asAdmin }) => {
        const updates = {
          configuration: {
            pattern: testIndex,
            row_limit: 200,
            custom_instructions: 'Updated custom instructions',
          },
        };
        const response = await asAdmin.put(`${API_AGENT_BUILDER}/tools/update-search-test-tool`, {
          body: updates,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body.configuration.row_limit).toBe(200);
        expect(response.body.configuration.custom_instructions).toBe('Updated custom instructions');
      });
    });

    apiTest('PUT returns 404 for missing tool', async ({ asAdmin }) => {
      const response = await asAdmin.put(`${API_AGENT_BUILDER}/tools/non-existent-search-tool`, {
        body: { description: 'Updated description' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
    });

    apiTest('DELETE removes index search tool', async ({ asAdmin }) => {
      const testTool = { ...mockTool, id: 'delete-search-test-tool' };
      await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: testTool,
        responseType: 'json',
      });
      createdToolIds.push(testTool.id);
      const del = await asAdmin.delete(`${API_AGENT_BUILDER}/tools/delete-search-test-tool`, {
        responseType: 'json',
      });
      expect(del).toHaveStatusCode(200);
      expect(del.body.success).toBe(true);
      const removeIdx = createdToolIds.indexOf('delete-search-test-tool');
      // eslint-disable-next-line playwright/prefer-comparison-matcher
      expect(removeIdx >= 0).toBe(true);
      createdToolIds.splice(removeIdx, 1);
    });

    apiTest('DELETE missing tool returns expected message', async ({ asAdmin }) => {
      const response = await asAdmin.delete(`${API_AGENT_BUILDER}/tools/non-existent-search-tool`, {
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
      expect(response.body.message).toBe('Tool non-existent-search-tool not found');
    });
  }
);
