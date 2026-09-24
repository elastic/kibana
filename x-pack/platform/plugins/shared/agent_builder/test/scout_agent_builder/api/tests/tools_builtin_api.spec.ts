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
import { API_AGENT_BUILDER } from '../fixtures/constants';

apiTest.describe(
  'Agent Builder — builtin tools API',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    apiTest('DELETE read-only builtin tool returns 400', async ({ asAdmin }) => {
      const toolId = platformCoreTools.generateEsql;
      const response = await asAdmin.delete(
        `${API_AGENT_BUILDER}/tools/${encodeURIComponent(toolId)}`,
        { responseType: 'json' }
      );
      expect(response).toHaveStatusCode(400);
      expect(String(response.body.message)).toContain('read-only');
      expect(String(response.body.message)).toContain("can't be deleted");
    });

    apiTest('PUT builtin tool returns 400', async ({ asAdmin }) => {
      const searchTool = platformCoreTools.search;
      const response = await asAdmin.put(
        `${API_AGENT_BUILDER}/tools/${encodeURIComponent(searchTool)}`,
        {
          body: { description: 'Updated description' },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(400);
    });

    apiTest('POST cannot create tool with builtin id namespace', async ({ asAdmin }) => {
      const searchTool = platformCoreTools.search;
      const toolData = {
        id: searchTool,
        type: 'esql',
        description: 'Attempting to create tool with builtin ID',
        configuration: {
          query: 'FROM test | LIMIT 10',
          params: {},
        },
      };
      const response = await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: toolData,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expect(String(response.body.message)).toContain('Invalid tool id');
      expect(String(response.body.message)).toContain('protected namespace');
    });

    apiTest('POST /tools/_execute runs builtin list_indices', async ({ asAdmin }) => {
      const response = await asAdmin.post(`${API_AGENT_BUILDER}/tools/_execute`, {
        body: { tool_id: platformCoreTools.listIndices, tool_params: {} },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.results).toBeDefined();
    });
  }
);
