/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';
import { spaceUrl } from '../fixtures/space_paths';

const CONTEXT_ENGINE_ENABLED_SETTING = 'contextEngine:enabled';

// `contextEngine:enabled` is space-scoped, so the enabled cases run in their own space and the
// disabled cases use the default space, where the setting keeps its `false` default. Flipping it
// in the default space would leak into every other spec sharing this Kibana instance —
// `agents_api.spec.ts` strictly compares a `configuration` object across a GET→PUT round-trip.
const CONTEXT_ENGINE_SPACE = 'agent-builder-ai-indices';

const mockAgent = (id: string, aiIndices?: string[]) => ({
  id,
  name: 'AI Index Test Agent',
  description: 'Checks ai_indices round-trip and gating',
  configuration: {
    instructions: 'You search Kibana assets.',
    tools: [{ tool_ids: ['platform.core.search'] }],
    ...(aiIndices === undefined ? {} : { ai_indices: aiIndices }),
  },
});

apiTest.describe(
  'Agent Builder — agent ai_indices API',
  { tag: [...tags.stateful.classic] },
  () => {
    const createdAgents: Array<{ agentId: string; spaceId: string }> = [];
    const enabledPath = (url: string) => spaceUrl(url, CONTEXT_ENGINE_SPACE);
    const defaultAgentPath = `${API_AGENT_BUILDER}/agents/${agentBuilderDefaultAgentId}`;

    apiTest.beforeAll(async ({ asAdmin, kbnClient }) => {
      await kbnClient.request({
        method: 'POST',
        path: '/api/spaces/space',
        body: { id: CONTEXT_ENGINE_SPACE, name: CONTEXT_ENGINE_SPACE, disabledFeatures: [] },
      });
      await kbnClient.uiSettings.update(
        { [CONTEXT_ENGINE_ENABLED_SETTING]: true },
        { space: CONTEXT_ENGINE_SPACE }
      );

      // The setting is cached per Kibana node, so poll on the behaviour it drives rather than
      // assuming the write is immediately visible to the node serving the next request.
      await expect
        .poll(
          async () => {
            const response = await asAdmin.get(enabledPath(defaultAgentPath), {
              responseType: 'json',
            });
            return response.body?.configuration?.ai_indices;
          },
          { timeout: 30_000, message: 'contextEngine:enabled did not propagate' }
        )
        .toBeDefined();
    });

    apiTest.afterAll(async ({ asAdmin, kbnClient }) => {
      await Promise.allSettled(
        createdAgents.map(({ agentId, spaceId }) =>
          asAdmin.delete(
            spaceUrl(`${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentId)}`, spaceId)
          )
        )
      );
      await kbnClient.uiSettings.unset(CONTEXT_ENGINE_ENABLED_SETTING, {
        space: CONTEXT_ENGINE_SPACE,
      });
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/spaces/space/${CONTEXT_ENGINE_SPACE}`,
      });
    });

    apiTest('disabled: GET omits ai_indices entirely', async ({ asAdmin }) => {
      const response = await asAdmin.get(defaultAgentPath, { responseType: 'json' });

      expect(response).toHaveStatusCode(200);
      expect(response.body.configuration.ai_indices).toBeUndefined();
    });

    apiTest('disabled: POST rejects ai_indices with a 400', async ({ asAdmin }) => {
      const response = await asAdmin.post(`${API_AGENT_BUILDER}/agents`, {
        body: mockAgent('ai-index-rejected-agent', ['my-custom-index', 'another-index']),
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(String(response.body.message)).toContain('ai_indices');
    });

    apiTest('disabled: PUT rejects ai_indices with a 400', async ({ asAdmin }) => {
      const agentId = 'ai-index-put-rejected-agent';
      const createResponse = await asAdmin.post(`${API_AGENT_BUILDER}/agents`, {
        body: mockAgent(agentId),
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      createdAgents.push({ agentId, spaceId: 'default' });

      const response = await asAdmin.put(`${API_AGENT_BUILDER}/agents/${agentId}`, {
        body: { configuration: { ai_indices: ['my-custom-index'] } },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(String(response.body.message)).toContain('ai_indices');
    });

    apiTest('enabled: GET returns ai_indices: [] for the default agent', async ({ asAdmin }) => {
      const response = await asAdmin.get(enabledPath(defaultAgentPath), { responseType: 'json' });

      expect(response).toHaveStatusCode(200);
      expect(response.body.configuration.ai_indices).toStrictEqual([]);
    });

    apiTest('enabled: POST accepts ai_indices and round-trips them', async ({ asAdmin }) => {
      const agentId = 'ai-index-test-agent';
      const aiIndices = ['my-custom-index', 'another-index'];

      const createResponse = await asAdmin.post(enabledPath(`${API_AGENT_BUILDER}/agents`), {
        body: mockAgent(agentId, aiIndices),
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      createdAgents.push({ agentId, spaceId: CONTEXT_ENGINE_SPACE });
      expect(createResponse.body.configuration.ai_indices).toStrictEqual(aiIndices);

      const getResponse = await asAdmin.get(enabledPath(`${API_AGENT_BUILDER}/agents/${agentId}`), {
        responseType: 'json',
      });
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.configuration.ai_indices).toStrictEqual(aiIndices);
    });

    apiTest('enabled: PUT accepts ai_indices and replaces the stored list', async ({ asAdmin }) => {
      const agentId = 'ai-index-update-agent';
      const createResponse = await asAdmin.post(enabledPath(`${API_AGENT_BUILDER}/agents`), {
        body: mockAgent(agentId, ['initial-index']),
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      createdAgents.push({ agentId, spaceId: CONTEXT_ENGINE_SPACE });

      const updateResponse = await asAdmin.put(
        enabledPath(`${API_AGENT_BUILDER}/agents/${agentId}`),
        {
          body: { configuration: { ai_indices: ['replacement-index'] } },
          responseType: 'json',
        }
      );

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body.configuration.ai_indices).toStrictEqual(['replacement-index']);
    });

    apiTest(
      'enabled: an agent created without ai_indices reads back as []',
      async ({ asAdmin }) => {
        const agentId = 'ai-index-defaulted-agent';

        const createResponse = await asAdmin.post(enabledPath(`${API_AGENT_BUILDER}/agents`), {
          body: mockAgent(agentId),
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        createdAgents.push({ agentId, spaceId: CONTEXT_ENGINE_SPACE });

        expect(createResponse.body.configuration.ai_indices).toStrictEqual([]);
      }
    );
  }
);
