/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId, AgentVisibility } from '@kbn/agent-builder-common';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER, COMMON_HEADERS } from '../fixtures/constants';

apiTest.describe(
  'Agent Builder — agents visibility API (stateful)',
  { tag: [...tags.stateful.classic] },
  () => {
    let adminCredentials: RoleApiCredentials;
    const createdAgentIds: string[] = [];

    const mockAgent = {
      id: 'test-agent-visibility',
      name: 'Test Agent',
      description: 'A test agent for API testing',
      configuration: {
        instructions: 'You are a helpful test agent',
        tools: [{ tool_ids: ['*'] }],
      },
    };

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
    });

    apiTest.afterAll(async ({ apiClient }) => {
      for (const agentId of createdAgentIds) {
        await apiClient.delete(`${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentId)}`, {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        });
      }
    });

    apiTest('POST allows explicit private visibility', async ({ apiClient }) => {
      const agentId = `visibility-private-agent-${Date.now()}`;
      const response = await apiClient.post(`${API_AGENT_BUILDER}/agents`, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        body: { ...mockAgent, id: agentId, visibility: AgentVisibility.Private },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ id: agentId, visibility: AgentVisibility.Private });
      createdAgentIds.push(agentId);
    });

    apiTest('PUT updates visibility explicitly', async ({ apiClient }) => {
      const agentId = `visibility-update-agent-${Date.now()}`;
      await apiClient.post(`${API_AGENT_BUILDER}/agents`, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        body: { ...mockAgent, id: agentId },
        responseType: 'json',
      });
      createdAgentIds.push(agentId);

      const response = await apiClient.put(
        `${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentId)}`,
        {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          body: { visibility: AgentVisibility.Shared },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ id: agentId, visibility: AgentVisibility.Shared });
    });

    apiTest('PUT rejects visibility change for default agent (404)', async ({ apiClient }) => {
      const getRes = await apiClient.get(
        `${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentBuilderDefaultAgentId)}`,
        { headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader }, responseType: 'json' }
      );
      expect(getRes).toHaveStatusCode(200);

      const response = await apiClient.put(
        `${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentBuilderDefaultAgentId)}`,
        {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          body: { visibility: AgentVisibility.Private },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(404);
      expect(response.body).toHaveProperty('message');
      expect(String(response.body.message)).toContain('not found');
    });
  }
);
