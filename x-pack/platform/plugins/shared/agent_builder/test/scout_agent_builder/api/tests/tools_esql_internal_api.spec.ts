/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER, COMMON_HEADERS, INTERNAL_AGENT_BUILDER } from '../fixtures/constants';

apiTest.describe(
  'Agent Builder — ES|QL tools internal API',
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

    let adminInteractiveCookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminInteractiveCookieHeader = cookieHeader;
    });

    apiTest.afterAll(async ({ asAdmin }) => {
      for (const toolId of createdToolIds) {
        await asAdmin.delete(`${API_AGENT_BUILDER}/tools/${encodeURIComponent(toolId)}`);
      }
    });

    const ih = () => ({ ...COMMON_HEADERS, ...adminInteractiveCookieHeader });

    apiTest('bulk delete removes created tools', async ({ asAdmin, apiClient }) => {
      for (let i = 0; i < 4; i++) {
        const testTool = { ...mockTool, id: `bulk-delete-test-tool-${i}` };
        const response = await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
          body: testTool,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        createdToolIds.push(response.body.id as string);
      }

      const toolIdsToDelete = [0, 1].map((i) => `bulk-delete-test-tool-${i}`);
      const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/tools/_bulk_delete`, {
        headers: ih(),
        body: { ids: toolIdsToDelete },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      for (const result of response.body.results as Array<{ success: boolean; toolId: string }>) {
        expect(result.success).toBe(true);
        expect(toolIdsToDelete).toContain(result.toolId);
      }
      for (const id of toolIdsToDelete) {
        const removeIdx = createdToolIds.indexOf(id);
        // eslint-disable-next-line playwright/prefer-comparison-matcher
        expect(removeIdx >= 0).toBe(true);
        createdToolIds.splice(removeIdx, 1);
      }
    });

    apiTest('bulk delete handles mix of existing and missing ids', async ({ apiClient }) => {
      const toolIdsToDelete = [2, 3].map((i) => `bulk-delete-test-tool-${i}`);
      const nonExistentToolId = 'this-tool-does-not-exist';
      const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/tools/_bulk_delete`, {
        headers: ih(),
        body: { ids: [...toolIdsToDelete, nonExistentToolId] },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const results = response.body.results as Array<{
        success: boolean;
        toolId: string;
        reason?: { error?: { message?: string } };
      }>;
      expect(results.filter((r) => r.success)).toHaveLength(2);
      const failure = results.find((r) => !r.success);
      expect(failure?.toolId).toBe(nonExistentToolId);
      expect(String(failure?.reason?.error?.message)).toContain('not found');
      for (const id of toolIdsToDelete) {
        const removeIdx = createdToolIds.indexOf(id);
        // eslint-disable-next-line playwright/prefer-comparison-matcher
        expect(removeIdx >= 0).toBe(true);
        createdToolIds.splice(removeIdx, 1);
      }
    });

    apiTest('bulk delete rejects empty ids', async ({ apiClient }) => {
      const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/tools/_bulk_delete`, {
        headers: ih(),
        body: { ids: [] },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });
  }
);
