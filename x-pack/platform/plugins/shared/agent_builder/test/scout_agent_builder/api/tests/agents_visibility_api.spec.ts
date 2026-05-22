/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId, AgentVisibility } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';

apiTest.describe(
  'Agent Builder — agents visibility API',
  { tag: [...tags.stateful.classic] },
  () => {
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

    apiTest.afterAll(async ({ asAdmin }) => {
      for (const agentId of createdAgentIds) {
        await asAdmin.delete(`${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentId)}`);
      }
    });

    apiTest('POST allows explicit private visibility', async ({ asAdmin }) => {
      const agentId = `visibility-private-agent-${Date.now()}`;
      const response = await asAdmin.post(`${API_AGENT_BUILDER}/agents`, {
        body: { ...mockAgent, id: agentId, visibility: AgentVisibility.Private },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ id: agentId, visibility: AgentVisibility.Private });
      createdAgentIds.push(agentId);
    });

    apiTest('PUT updates visibility explicitly', async ({ asAdmin }) => {
      const agentId = `visibility-update-agent-${Date.now()}`;
      await asAdmin.post(`${API_AGENT_BUILDER}/agents`, {
        body: { ...mockAgent, id: agentId },
        responseType: 'json',
      });
      createdAgentIds.push(agentId);

      const response = await asAdmin.put(
        `${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentId)}`,
        {
          body: { visibility: AgentVisibility.Shared },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ id: agentId, visibility: AgentVisibility.Shared });
    });

    apiTest('PUT rejects visibility change for default agent (404)', async ({ asAdmin }) => {
      const getRes = await asAdmin.get(
        `${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentBuilderDefaultAgentId)}`,
        { responseType: 'json' }
      );
      expect(getRes).toHaveStatusCode(200);

      const response = await asAdmin.put(
        `${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentBuilderDefaultAgentId)}`,
        {
          body: { visibility: AgentVisibility.Private },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(404);
      expect(response.body.message).toBeDefined();
      expect(String(response.body.message)).toContain('not found');
    });
  }
);
