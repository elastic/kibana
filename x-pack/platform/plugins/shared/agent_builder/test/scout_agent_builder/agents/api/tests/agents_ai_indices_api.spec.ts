/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, API_AGENT_BUILDER } from '../fixtures';

// Covers what the route unit tests structurally cannot: those invoke handlers directly, so they
// exercise neither the request schema nor persistence. These tests take `ai_indices` through
// request validation, `createRequestToEs`, the `keyword` mapping in the agents index, and back
// out via `fromEs`.
//
// Everything here runs with the Context Engine **enabled**, the only state reachable in Scout:
// the `agent_builder` config set pins `--uiSettings.overrides.contextEngine:enabled=true` (see
// `kbn-scout/src/servers/configs/config_sets/agent_builder/`), and `uiSettings.overrides` are
// read-only and apply to every space — so the flag can't be turned off for a test, not even in a
// dedicated space. The disabled behaviour (field absent from responses, 400 on write) is covered
// by the route unit tests in `server/routes/agents.test.ts`.
apiTest.describe(
  'Agent Builder — agent ai_indices API',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    const createdAgentIds: string[] = [];

    const mockAgent = (id: string, aiIndices?: string[]) => ({
      id,
      name: 'AI Index Test Agent',
      description: 'Checks ai_indices round-trip',
      configuration: {
        instructions: 'You search Kibana assets.',
        tools: [{ tool_ids: ['*'] }],
        ...(aiIndices === undefined ? {} : { ai_indices: aiIndices }),
      },
    });

    apiTest.afterAll(async ({ asAdmin }) => {
      await Promise.allSettled(
        createdAgentIds.map((agentId) =>
          asAdmin.delete(`${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentId)}`)
        )
      );
    });

    apiTest('GET returns ai_indices: [] for the default agent', async ({ asAdmin }) => {
      const response = await asAdmin.get(
        `${API_AGENT_BUILDER}/agents/${agentBuilderDefaultAgentId}`,
        { responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.configuration.ai_indices).toStrictEqual([]);
    });

    apiTest('POST accepts ai_indices and round-trips them', async ({ asAdmin }) => {
      const agentId = 'ai-index-test-agent';
      const aiIndices = ['my-custom-index', 'another-index'];

      const createResponse = await asAdmin.post(`${API_AGENT_BUILDER}/agents`, {
        body: mockAgent(agentId, aiIndices),
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      createdAgentIds.push(agentId);
      expect(createResponse.body.configuration.ai_indices).toStrictEqual(aiIndices);

      const getResponse = await asAdmin.get(`${API_AGENT_BUILDER}/agents/${agentId}`, {
        responseType: 'json',
      });
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.configuration.ai_indices).toStrictEqual(aiIndices);
    });

    // `updateRequestToEs` merges the update over the stored config, so a partial update from the
    // agent edit form must not drop a list it never mentions.
    apiTest(
      'PUT leaves stored ai_indices alone when the update omits them',
      async ({ asAdmin }) => {
        const agentId = 'ai-index-partial-update-agent';
        const createResponse = await asAdmin.post(`${API_AGENT_BUILDER}/agents`, {
          body: mockAgent(agentId, ['kept-index']),
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        createdAgentIds.push(agentId);

        const updateResponse = await asAdmin.put(`${API_AGENT_BUILDER}/agents/${agentId}`, {
          body: { configuration: { instructions: 'Updated instructions.' } },
          responseType: 'json',
        });

        expect(updateResponse).toHaveStatusCode(200);
        expect(updateResponse.body.configuration.ai_indices).toStrictEqual(['kept-index']);
      }
    );
  }
);
