/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { ToolType } from '@kbn/agent-builder-common';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { ListAgentResponse } from '../../../../common/http_api/agents';
import type { ListToolsResponse } from '../../../../common/http_api/tools';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER, COMMON_HEADERS } from '../fixtures/constants';
import { spaceUrl } from '../fixtures/space_paths';

apiTest.describe(
  'Agent Builder — spaces API',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let adminCredentials: RoleApiCredentials;
    const testTools: Array<{ toolId: string; spaceId: string }> = [
      { toolId: 'default-tool-1', spaceId: 'default' },
      { toolId: 'default-tool-2', spaceId: 'default' },
      { toolId: 'space1-tool-1', spaceId: 'space-1' },
      { toolId: 'space1-tool-2', spaceId: 'space-1' },
      { toolId: 'space2-tool-1', spaceId: 'space-2' },
    ];
    const testAgents: Array<{ agentId: string; spaceId: string }> = [
      { agentId: 'default-agent-1', spaceId: 'default' },
      { agentId: 'default-agent-2', spaceId: 'default' },
      { agentId: 'space1-agent-1', spaceId: 'space-1' },
      { agentId: 'space1-agent-2', spaceId: 'space-1' },
      { agentId: 'space2-agent-1', spaceId: 'space-2' },
    ];

    apiTest.beforeAll(async ({ requestAuth, kbnClient, esClient }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      for (const spaceId of ['space-1', 'space-2']) {
        await kbnClient.request({
          method: 'POST',
          path: '/api/spaces/space',
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          body: { id: spaceId, name: spaceId, disabledFeatures: [] },
        });
      }
      await esClient.indices.create({ index: 'spaces-test-index', mappings: { dynamic: true } });

      for (const tool of testTools) {
        await kbnClient.request({
          method: 'POST',
          path: spaceUrl(`${API_AGENT_BUILDER}/tools`, tool.spaceId),
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
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
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
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
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        });
      }
      for (const agent of testAgents) {
        await kbnClient.request({
          method: 'DELETE',
          path: spaceUrl(
            `${API_AGENT_BUILDER}/agents/${encodeURIComponent(agent.agentId)}`,
            agent.spaceId
          ),
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        });
      }
      await esClient.indices.delete({ index: 'spaces-test-index' });
      for (const spaceId of ['space-1', 'space-2']) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/spaces/space/${encodeURIComponent(spaceId)}`,
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        });
      }
    });

    for (const spaceId of ['default', 'space-1', 'space-2'] as const) {
      apiTest(`lists tools in space ${spaceId}`, async ({ apiClient }) => {
        const response = await apiClient.get(spaceUrl(`${API_AGENT_BUILDER}/tools`, spaceId), {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const res = response.body as ListToolsResponse;
        const tools = res.results.filter((tool) => !tool.readonly);
        const expectedTools = testTools
          .filter((tool) => tool.spaceId === spaceId)
          .map((tool) => tool.toolId)
          .sort();
        expect(tools.map((tool) => tool.id).sort()).toStrictEqual(expectedTools);
      });

      apiTest(`lists agents in space ${spaceId}`, async ({ apiClient }) => {
        const response = await apiClient.get(spaceUrl(`${API_AGENT_BUILDER}/agents`, spaceId), {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const res = response.body as ListAgentResponse;
        const agents = res.results.filter((agent) => !agent.readonly);
        const expectedAgents = [
          agentBuilderDefaultAgentId,
          ...testAgents.filter((agent) => agent.spaceId === spaceId).map((agent) => agent.agentId),
        ].sort();
        expect(agents.map((agent) => agent.id).sort()).toStrictEqual(expectedAgents);
      });
    }
  }
);
