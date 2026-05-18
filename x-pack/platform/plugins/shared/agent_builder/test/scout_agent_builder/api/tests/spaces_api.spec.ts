/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { ToolType } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { ListAgentResponse } from '../../../../common/http_api/agents';
import type { ListToolsResponse } from '../../../../common/http_api/tools';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';
import { spaceUrl } from '../fixtures/space_paths';

apiTest.describe(
  'Agent Builder — spaces API',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    const SPACE_1 = 'spaces-api-test-1';
    const SPACE_2 = 'spaces-api-test-2';

    const testTools: Array<{ toolId: string; spaceId: string }> = [
      { toolId: 'default-tool-1', spaceId: 'default' },
      { toolId: 'default-tool-2', spaceId: 'default' },
      { toolId: 'space1-tool-1', spaceId: SPACE_1 },
      { toolId: 'space1-tool-2', spaceId: SPACE_1 },
      { toolId: 'space2-tool-1', spaceId: SPACE_2 },
    ];
    const testAgents: Array<{ agentId: string; spaceId: string }> = [
      { agentId: 'default-agent-1', spaceId: 'default' },
      { agentId: 'default-agent-2', spaceId: 'default' },
      { agentId: 'space1-agent-1', spaceId: SPACE_1 },
      { agentId: 'space1-agent-2', spaceId: SPACE_1 },
      { agentId: 'space2-agent-1', spaceId: SPACE_2 },
    ];

    apiTest.beforeAll(async ({ kbnClient, esClient }) => {
      for (const spaceId of [SPACE_1, SPACE_2]) {
        await kbnClient.request({
          method: 'POST',
          path: '/api/spaces/space',
          body: { id: spaceId, name: spaceId, disabledFeatures: [] },
        });
      }
      await esClient.indices.create({ index: 'spaces-test-index', mappings: { dynamic: true } });

      for (const tool of testTools) {
        await kbnClient.request({
          method: 'POST',
          path: spaceUrl(`${API_AGENT_BUILDER}/tools`, tool.spaceId),
          body: {
            id: tool.toolId,
            type: ToolType.index_search,
            description: 'A test tool',
            configuration: { pattern: '*' },
          },
        });
      }
      for (const agent of testAgents) {
        await kbnClient.request({
          method: 'POST',
          path: spaceUrl(`${API_AGENT_BUILDER}/agents`, agent.spaceId),
          body: {
            id: agent.agentId,
            name: 'Test Agent',
            description: 'A test agent',
            configuration: { instructions: 'Run this agent', tools: [{ tool_ids: [] }] },
          },
        });
      }
    });

    apiTest.afterAll(async ({ kbnClient, esClient }) => {
      for (const tool of testTools) {
        await kbnClient.request({
          method: 'DELETE',
          path: spaceUrl(
            `${API_AGENT_BUILDER}/tools/${encodeURIComponent(tool.toolId)}`,
            tool.spaceId
          ),
        });
      }
      for (const agent of testAgents) {
        await kbnClient.request({
          method: 'DELETE',
          path: spaceUrl(
            `${API_AGENT_BUILDER}/agents/${encodeURIComponent(agent.agentId)}`,
            agent.spaceId
          ),
        });
      }
      await esClient.indices.delete({ index: 'spaces-test-index' });
      for (const spaceId of [SPACE_1, SPACE_2]) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/spaces/space/${encodeURIComponent(spaceId)}`,
        });
      }
    });

    // The default space is shared with other concurrent test suites,
    // so we only verify the expected tools/agents are present (toContain).
    apiTest('lists tools in space default', async ({ asAdmin }) => {
      const response = await asAdmin.get(spaceUrl(`${API_AGENT_BUILDER}/tools`, 'default'), {
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const res = response.body as ListToolsResponse;
      const toolIds = res.results.filter((tool) => !tool.readonly).map((tool) => tool.id);
      const expectedTools = testTools
        .filter((tool) => tool.spaceId === 'default')
        .map((tool) => tool.toolId);
      for (const expected of expectedTools) {
        expect(toolIds).toContain(expected);
      }
    });

    apiTest('lists agents in space default', async ({ asAdmin }) => {
      const response = await asAdmin.get(spaceUrl(`${API_AGENT_BUILDER}/agents`, 'default'), {
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const res = response.body as ListAgentResponse;
      const agentIds = res.results.filter((agent) => !agent.readonly).map((agent) => agent.id);
      const expectedAgents = [
        agentBuilderDefaultAgentId,
        ...testAgents.filter((agent) => agent.spaceId === 'default').map((agent) => agent.agentId),
      ];
      for (const expected of expectedAgents) {
        expect(agentIds).toContain(expected);
      }
    });

    // Custom spaces are fully owned by this suite, so we can assert exact lists.
    for (const spaceId of [SPACE_1, SPACE_2] as const) {
      apiTest(`lists tools in space ${spaceId}`, async ({ asAdmin }) => {
        const response = await asAdmin.get(spaceUrl(`${API_AGENT_BUILDER}/tools`, spaceId), {
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const res = response.body as ListToolsResponse;
        const toolIds = res.results
          .filter((tool) => !tool.readonly)
          .map((tool) => tool.id)
          .sort();
        const expectedTools = testTools
          .filter((tool) => tool.spaceId === spaceId)
          .map((tool) => tool.toolId)
          .sort();
        expect(toolIds).toStrictEqual(expectedTools);
      });

      apiTest(`lists agents in space ${spaceId}`, async ({ asAdmin }) => {
        const response = await asAdmin.get(spaceUrl(`${API_AGENT_BUILDER}/agents`, spaceId), {
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const res = response.body as ListAgentResponse;
        const agentIds = res.results
          .filter((agent) => !agent.readonly)
          .map((agent) => agent.id)
          .sort();
        const expectedAgents = [
          agentBuilderDefaultAgentId,
          ...testAgents.filter((agent) => agent.spaceId === spaceId).map((agent) => agent.agentId),
        ].sort();
        expect(agentIds).toStrictEqual(expectedAgents);
      });
    }
  }
);
