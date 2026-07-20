/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER, COMMON_HEADERS, INTERNAL_AGENT_BUILDER } from '../fixtures/constants';

apiTest.describe(
  'Agent Builder — builtin tools internal API',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let adminInteractiveCookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminInteractiveCookieHeader = cookieHeader;
    });

    const internalHeaders = () => ({
      ...COMMON_HEADERS,
      ...adminInteractiveCookieHeader,
    });

    apiTest('POST /internal/tools/_bulk_delete rejects builtin tools', async ({ apiClient }) => {
      const toolIds = Object.values(platformCoreTools).slice(0, 3) as string[];
      const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/tools/_bulk_delete`, {
        headers: internalHeaders(),
        body: { ids: toolIds },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.results).toHaveLength(3);
      for (let i = 0; i < toolIds.length; i++) {
        const result = response.body.results[i];
        expect(result.toolId).toBe(toolIds[i]);
        expect(result.success).toBe(false);
        expect(String(result.reason.error.message)).toContain("is read-only and can't be deleted");
      }
    });

    apiTest(
      'POST /internal/tools/_bulk_delete mixed builtin and custom',
      async ({ apiClient, asAdmin }) => {
        const searchTool = platformCoreTools.search;
        const customTool = {
          id: 'test-custom-tool',
          type: 'esql',
          description: 'A test custom tool',
          tags: ['test'],
          configuration: {
            query: 'FROM test_index | LIMIT 10',
            params: {},
          },
        };
        await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
          body: customTool,
          responseType: 'json',
        });

        const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/tools/_bulk_delete`, {
          headers: internalHeaders(),
          body: { ids: [searchTool, 'test-custom-tool'] },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const builtinResult = response.body.results.find(
          (r: { toolId: string }) => r.toolId === searchTool
        );
        expect(builtinResult.success).toBe(false);
        const customResult = response.body.results.find(
          (r: { toolId: string }) => r.toolId === 'test-custom-tool'
        );
        expect(customResult.success).toBe(true);
      }
    );
  }
);
