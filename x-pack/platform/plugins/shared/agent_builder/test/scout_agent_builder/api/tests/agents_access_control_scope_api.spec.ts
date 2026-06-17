/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId, AgentAccessControlScope } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';

apiTest.describe(
  'Agent Builder — agents access-control scope API',
  { tag: [...tags.stateful.classic] },
  () => {
    const createdAgentIds: string[] = [];

    const mockAgent = {
      id: 'test-agent-access-control-scope',
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

    apiTest('POST allows explicit private access-control scope', async ({ asAdmin }) => {
      const agentId = `access-control-private-agent-${Date.now()}`;
      const response = await asAdmin.post(`${API_AGENT_BUILDER}/agents`, {
        body: {
          ...mockAgent,
          id: agentId,
          access_control: { scope: AgentAccessControlScope.Private },
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({
        id: agentId,
        access_control: { scope: AgentAccessControlScope.Private, entries: [] },
      });
      createdAgentIds.push(agentId);
    });

    apiTest('PUT updates access-control scope explicitly', async ({ asAdmin }) => {
      const agentId = `access-control-update-agent-${Date.now()}`;
      await asAdmin.post(`${API_AGENT_BUILDER}/agents`, {
        body: { ...mockAgent, id: agentId },
        responseType: 'json',
      });
      createdAgentIds.push(agentId);

      const response = await asAdmin.put(
        `${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentId)}`,
        {
          body: { access_control: { scope: AgentAccessControlScope.Shared } },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({
        id: agentId,
        access_control: { scope: AgentAccessControlScope.Shared, entries: [] },
      });
    });

    apiTest(
      'PUT rejects access-control scope change for default agent (404)',
      async ({ asAdmin }) => {
        const getRes = await asAdmin.get(
          `${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentBuilderDefaultAgentId)}`,
          { responseType: 'json' }
        );
        expect(getRes).toHaveStatusCode(200);

        const response = await asAdmin.put(
          `${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentBuilderDefaultAgentId)}`,
          {
            body: { access_control: { scope: AgentAccessControlScope.Private } },
            responseType: 'json',
          }
        );
        expect(response).toHaveStatusCode(404);
        expect(response.body.message).toBeDefined();
        expect(String(response.body.message)).toContain('not found');
      }
    );
  }
);
