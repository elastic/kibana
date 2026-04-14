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
import { API_AGENT_BUILDER, COMMON_HEADERS, INTERNAL_AGENT_BUILDER } from '../fixtures/constants';
import type { ScoutAgentBuilderApiClient } from '../fixtures/converse_http';

const TOOL_USED_BY_AGENTS_ERROR_CODE = 'TOOL_USED_BY_AGENTS';

const IDS = {
  public: {
    toolInUse: 'ftr-tool-delete-force-public',
    toolUnused: 'ftr-tool-unused',
    agent: 'ftr-agent-uses-tool-public',
  },
  bulk: {
    tools: ['ftr-tool-bulk-1', 'ftr-tool-bulk-2'],
    agent: 'ftr-agent-uses-tool-bulk',
  },
} as const;

function esqlToolPayload(id: string, description: string) {
  return {
    id,
    type: 'esql',
    description,
    tags: [] as string[],
    configuration: {
      query: 'FROM .kibana | LIMIT 1',
      params: {} as Record<string, { type: string; description: string }>,
    },
  };
}

apiTest.describe(
  'Agent Builder — tool delete force API',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let adminCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
    });

    const h = () => ({ ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader });
    const ih = () => ({ ...h(), 'x-elastic-internal-origin': 'kibana' });

    async function deleteAgent(apiClient: ScoutAgentBuilderApiClient, agentId: string) {
      await apiClient.delete(`${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentId)}`, {
        headers: h(),
      });
    }

    async function deleteToolForce(apiClient: ScoutAgentBuilderApiClient, toolId: string) {
      await apiClient.delete(
        `${API_AGENT_BUILDER}/tools/${encodeURIComponent(toolId)}?force=true`,
        { headers: h() }
      );
    }

    apiTest.afterAll(async ({ apiClient }) => {
      await deleteAgent(apiClient, IDS.public.agent);
      await deleteAgent(apiClient, IDS.bulk.agent);
      for (const id of [IDS.public.toolInUse, IDS.public.toolUnused, ...IDS.bulk.tools]) {
        await deleteToolForce(apiClient, id);
      }
    });

    apiTest('DELETE public: unused tool without force succeeds', async ({ apiClient }) => {
      await deleteAgent(apiClient, IDS.public.agent);
      for (const id of [IDS.public.toolInUse, IDS.public.toolUnused]) {
        await deleteToolForce(apiClient, id);
      }
      await apiClient.post(`${API_AGENT_BUILDER}/tools`, {
        headers: h(),
        body: esqlToolPayload(IDS.public.toolInUse, 'FTR tool for delete force tests'),
        responseType: 'json',
      });
      await apiClient.post(`${API_AGENT_BUILDER}/tools`, {
        headers: h(),
        body: esqlToolPayload(IDS.public.toolUnused, 'FTR tool not used by any agent'),
        responseType: 'json',
      });
      await apiClient.post(`${API_AGENT_BUILDER}/agents`, {
        headers: h(),
        body: {
          id: IDS.public.agent,
          name: 'FTR Agent Using Tool',
          description: 'FTR agent for tool delete tests',
          configuration: {
            instructions: 'Test',
            tools: [{ tool_ids: [IDS.public.toolInUse] }],
          },
        },
        responseType: 'json',
      });

      const response = await apiClient.delete(
        `${API_AGENT_BUILDER}/tools/${encodeURIComponent(IDS.public.toolUnused)}`,
        { headers: h(), responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      expect(response.body.success).toBe(true);
    });

    apiTest('DELETE public: in-use tool without force returns 409', async ({ apiClient }) => {
      const response = await apiClient.delete(
        `${API_AGENT_BUILDER}/tools/${encodeURIComponent(IDS.public.toolInUse)}`,
        { headers: h(), responseType: 'json' }
      );
      expect(response).toHaveStatusCode(409);
      expect(response.body.attributes.code).toBe(TOOL_USED_BY_AGENTS_ERROR_CODE);
      expect(response.body.attributes.agents.length).toBeGreaterThan(0);
    });

    apiTest('DELETE public: force=true deletes in-use tool', async ({ apiClient }) => {
      const response = await apiClient.delete(
        `${API_AGENT_BUILDER}/tools/${encodeURIComponent(IDS.public.toolInUse)}?force=true`,
        { headers: h(), responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      expect(response.body.success).toBe(true);
      const getRes = await apiClient.get(
        `${API_AGENT_BUILDER}/tools/${encodeURIComponent(IDS.public.toolInUse)}`,
        { headers: h(), responseType: 'json' }
      );
      expect(getRes).toHaveStatusCode(404);
    });

    apiTest('POST internal bulk_delete without force returns 409', async ({ apiClient }) => {
      await deleteAgent(apiClient, IDS.bulk.agent);
      for (const id of IDS.bulk.tools) {
        await deleteToolForce(apiClient, id);
      }
      for (const id of IDS.bulk.tools) {
        await apiClient.post(`${API_AGENT_BUILDER}/tools`, {
          headers: h(),
          body: esqlToolPayload(id, `FTR bulk delete tool ${id}`),
          responseType: 'json',
        });
      }
      await apiClient.post(`${API_AGENT_BUILDER}/agents`, {
        headers: h(),
        body: {
          id: IDS.bulk.agent,
          name: 'FTR Agent Using Bulk Tools',
          description: 'FTR agent',
          configuration: {
            instructions: 'Test',
            tools: [{ tool_ids: [...IDS.bulk.tools] }],
          },
        },
        responseType: 'json',
      });

      const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/tools/_bulk_delete`, {
        headers: ih(),
        body: { ids: IDS.bulk.tools, force: false },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(409);
      expect(response.body.attributes.code).toBe(TOOL_USED_BY_AGENTS_ERROR_CODE);
    });

    apiTest('POST internal bulk_delete with force deletes tools', async ({ apiClient }) => {
      const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/tools/_bulk_delete`, {
        headers: ih(),
        body: { ids: IDS.bulk.tools, force: true },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.results).toHaveLength(IDS.bulk.tools.length);
      for (let i = 0; i < IDS.bulk.tools.length; i++) {
        expect(response.body.results[i].toolId).toBe(IDS.bulk.tools[i]);
        expect(response.body.results[i].success).toBe(true);
      }
      for (const id of IDS.bulk.tools) {
        const getRes = await apiClient.get(`${API_AGENT_BUILDER}/tools/${encodeURIComponent(id)}`, {
          headers: h(),
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(404);
      }
    });
  }
);
