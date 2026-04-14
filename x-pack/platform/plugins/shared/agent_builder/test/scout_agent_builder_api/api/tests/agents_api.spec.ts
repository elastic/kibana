/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentVisibility } from '@kbn/agent-builder-common';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER, COMMON_HEADERS } from '../fixtures/constants';

apiTest.describe(
  'Agent Builder — agents API',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let adminCredentials: RoleApiCredentials;
    const createdAgentIds: string[] = [];

    const mockAgent = {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent for API testing',
      configuration: {
        instructions: 'You are a helpful test agent',
        tools: [
          {
            tool_ids: ['*'],
          },
        ],
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

    apiTest('POST /api/agent_builder/agents creates agent', async ({ apiClient }) => {
      const response = await apiClient.post(`${API_AGENT_BUILDER}/agents`, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        body: mockAgent,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({
        id: mockAgent.id,
        name: mockAgent.name,
        description: mockAgent.description,
      });
      expect(response.body).toHaveProperty('configuration');
      expect(response.body.configuration).toMatchObject({
        instructions: mockAgent.configuration.instructions,
        tools: mockAgent.configuration.tools,
      });
      createdAgentIds.push(mockAgent.id);
    });

    apiTest('POST /api/agent_builder/agents validates agent ID format', async ({ apiClient }) => {
      const invalidAgent = {
        ...mockAgent,
        id: 'invalid agent id!',
      };
      const response = await apiClient.post(`${API_AGENT_BUILDER}/agents`, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        body: invalidAgent,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body).toHaveProperty('message');
      expect(String(response.body.message)).toContain('Invalid agent id');
    });

    apiTest('POST /api/agent_builder/agents requires required fields', async ({ apiClient }) => {
      const response = await apiClient.post(`${API_AGENT_BUILDER}/agents`, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        body: { id: 'incomplete-agent' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest(
      'POST /api/agent_builder/agents validates tool configuration',
      async ({ apiClient }) => {
        const agentWithInvalidTools = {
          ...mockAgent,
          id: 'invalid-tools-agent',
          configuration: {
            instructions: 'Test agent with invalid tools',
            tools: [
              {
                tool_ids: ['non-existent-tool'],
              },
            ],
          },
        };
        const response = await apiClient.post(`${API_AGENT_BUILDER}/agents`, {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          body: agentWithInvalidTools,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest(
      'POST /api/agent_builder/agents defaults visibility to public with created_by',
      async ({ apiClient }) => {
        const agentId = `visibility-default-agent-${Date.now()}`;
        const response = await apiClient.post(`${API_AGENT_BUILDER}/agents`, {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          body: { ...mockAgent, id: agentId },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({ id: agentId, visibility: AgentVisibility.Public });
        expect(response.body).toHaveProperty('created_by');
        expect(response.body.created_by).toMatchObject({
          username: expect.any(String),
        });
        createdAgentIds.push(agentId);
      }
    );

    apiTest('GET /api/agent_builder/agents/:id retrieves existing agent', async ({ apiClient }) => {
      const testAgent = { ...mockAgent, id: 'get-test-agent' };
      const createRes = await apiClient.post(`${API_AGENT_BUILDER}/agents`, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        body: testAgent,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      createdAgentIds.push(createRes.body.id as string);

      const response = await apiClient.get(`${API_AGENT_BUILDER}/agents/get-test-agent`, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({
        id: 'get-test-agent',
        name: mockAgent.name,
        description: mockAgent.description,
      });
      expect(response.body.configuration.instructions).toBe(mockAgent.configuration.instructions);
      expect(response.body.configuration.tools).toStrictEqual(mockAgent.configuration.tools);
    });

    apiTest(
      'GET /api/agent_builder/agents/:id returns 404 for missing agent',
      async ({ apiClient }) => {
        const response = await apiClient.get(`${API_AGENT_BUILDER}/agents/non-existent-agent`, {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(404);
        expect(response.body).toHaveProperty('message');
        expect(String(response.body.message)).toContain('not found');
      }
    );

    apiTest('GET /api/agent_builder/agents lists agents', async ({ apiClient }) => {
      const testAgentIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const testAgent = {
          ...mockAgent,
          id: `list-test-agent-${i}`,
          name: `List Test Agent ${i}`,
        };
        const res = await apiClient.post(`${API_AGENT_BUILDER}/agents`, {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          body: testAgent,
          responseType: 'json',
        });
        expect(res).toHaveStatusCode(200);
        testAgentIds.push(testAgent.id);
        createdAgentIds.push(testAgent.id);
      }

      const response = await apiClient.get(`${API_AGENT_BUILDER}/agents`, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBeGreaterThan(1);
    });

    apiTest('PUT /api/agent_builder/agents/:id updates agent fields', async ({ apiClient }) => {
      const testAgent = { ...mockAgent, id: 'update-test-agent' };
      await apiClient.post(`${API_AGENT_BUILDER}/agents`, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        body: testAgent,
        responseType: 'json',
      });
      createdAgentIds.push(testAgent.id);

      const updates = { name: 'Updated Test Agent', description: 'Updated description' };
      const response = await apiClient.put(`${API_AGENT_BUILDER}/agents/update-test-agent`, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        body: updates,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({
        id: 'update-test-agent',
        name: updates.name,
        description: updates.description,
      });
    });

    apiTest('PUT /api/agent_builder/agents/:id updates configuration', async ({ apiClient }) => {
      const configUpdates = {
        configuration: {
          instructions: 'Updated instructions for the agent',
          tools: [],
        },
      };
      const response = await apiClient.put(`${API_AGENT_BUILDER}/agents/update-test-agent`, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        body: configUpdates,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ id: 'update-test-agent' });
      expect(response.body.configuration.instructions).toBe(
        configUpdates.configuration.instructions
      );
      expect(response.body.configuration.tools).toStrictEqual(configUpdates.configuration.tools);
    });

    apiTest(
      'PUT /api/agent_builder/agents/:id returns 404 for missing agent',
      async ({ apiClient }) => {
        const response = await apiClient.put(`${API_AGENT_BUILDER}/agents/non-existent-agent`, {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          body: { name: 'Updated name' },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest('DELETE /api/agent_builder/agents/:id deletes agent', async ({ apiClient }) => {
      const testAgent = { ...mockAgent, id: 'delete-test-agent' };
      await apiClient.post(`${API_AGENT_BUILDER}/agents`, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        body: testAgent,
        responseType: 'json',
      });
      createdAgentIds.push(testAgent.id);

      const response = await apiClient.delete(`${API_AGENT_BUILDER}/agents/delete-test-agent`, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ success: true });
      const removeIdx = createdAgentIds.indexOf('delete-test-agent');
      expect(removeIdx).toBeGreaterThanOrEqual(0);
      createdAgentIds.splice(removeIdx, 1);
    });

    apiTest(
      'DELETE /api/agent_builder/agents/:id returns 404 for missing agent',
      async ({ apiClient }) => {
        const response = await apiClient.delete(`${API_AGENT_BUILDER}/agents/non-existent-agent`, {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(404);
        expect(response.body).toHaveProperty('message');
        expect(String(response.body.message)).toContain('not found');
      }
    );
  }
);
