/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { AuthedApiClient } from '../../../scout_agent_builder_shared/lib/authed_api_client';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER, COMMON_HEADERS, INTERNAL_AGENT_BUILDER } from '../fixtures/constants';

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
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let adminInteractiveCookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminInteractiveCookieHeader = cookieHeader;
    });

    const ih = () => ({ ...COMMON_HEADERS, ...adminInteractiveCookieHeader });

    async function deleteAgent(asAdmin: AuthedApiClient, agentId: string) {
      await asAdmin.delete(`${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentId)}`);
    }

    async function deleteToolForce(asAdmin: AuthedApiClient, toolId: string) {
      await asAdmin.delete(`${API_AGENT_BUILDER}/tools/${encodeURIComponent(toolId)}?force=true`);
    }

    apiTest.afterAll(async ({ asAdmin }) => {
      await deleteAgent(asAdmin, IDS.public.agent);
      await deleteAgent(asAdmin, IDS.bulk.agent);
      for (const id of [IDS.public.toolInUse, IDS.public.toolUnused, ...IDS.bulk.tools]) {
        await deleteToolForce(asAdmin, id);
      }
    });

    apiTest('DELETE public: unused tool without force succeeds', async ({ asAdmin }) => {
      await deleteAgent(asAdmin, IDS.public.agent);
      for (const id of [IDS.public.toolInUse, IDS.public.toolUnused]) {
        await deleteToolForce(asAdmin, id);
      }
      await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: esqlToolPayload(IDS.public.toolInUse, 'FTR tool for delete force tests'),
        responseType: 'json',
      });
      await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
        body: esqlToolPayload(IDS.public.toolUnused, 'FTR tool not used by any agent'),
        responseType: 'json',
      });
      await asAdmin.post(`${API_AGENT_BUILDER}/agents`, {
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

      const response = await asAdmin.delete(
        `${API_AGENT_BUILDER}/tools/${encodeURIComponent(IDS.public.toolUnused)}`,
        { responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      expect(response.body.success).toBe(true);
    });

    apiTest('DELETE public: in-use tool without force returns 409', async ({ asAdmin }) => {
      const response = await asAdmin.delete(
        `${API_AGENT_BUILDER}/tools/${encodeURIComponent(IDS.public.toolInUse)}`,
        { responseType: 'json' }
      );
      expect(response).toHaveStatusCode(409);
      expect(response.body.attributes.code).toBe(TOOL_USED_BY_AGENTS_ERROR_CODE);
      expect(response.body.attributes.agents.length).toBeGreaterThan(0);
    });

    apiTest('DELETE public: force=true deletes in-use tool', async ({ asAdmin }) => {
      const response = await asAdmin.delete(
        `${API_AGENT_BUILDER}/tools/${encodeURIComponent(IDS.public.toolInUse)}?force=true`,
        { responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      expect(response.body.success).toBe(true);
      const getRes = await asAdmin.get(
        `${API_AGENT_BUILDER}/tools/${encodeURIComponent(IDS.public.toolInUse)}`,
        { responseType: 'json' }
      );
      expect(getRes).toHaveStatusCode(404);
    });

    apiTest(
      'POST internal bulk_delete without force returns 409',
      async ({ asAdmin, apiClient }) => {
        await deleteAgent(asAdmin, IDS.bulk.agent);
        for (const id of IDS.bulk.tools) {
          await deleteToolForce(asAdmin, id);
        }
        for (const id of IDS.bulk.tools) {
          await asAdmin.post(`${API_AGENT_BUILDER}/tools`, {
            body: esqlToolPayload(id, `FTR bulk delete tool ${id}`),
            responseType: 'json',
          });
        }
        await asAdmin.post(`${API_AGENT_BUILDER}/agents`, {
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
      }
    );

    apiTest(
      'POST internal bulk_delete with force deletes tools',
      async ({ asAdmin, apiClient }) => {
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
          const getRes = await asAdmin.get(`${API_AGENT_BUILDER}/tools/${encodeURIComponent(id)}`, {
            responseType: 'json',
          });
          expect(getRes).toHaveStatusCode(404);
        }
      }
    );
  }
);
