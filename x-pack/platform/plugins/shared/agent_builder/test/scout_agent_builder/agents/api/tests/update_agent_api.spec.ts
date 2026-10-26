/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * End-to-end API integration tests for the Agent Builder "update agent" endpoint
 * (PUT /api/agent_builder/agents/:id).
 *
 * Test coverage:
 *   - Happy-path updates for every independently editable field.
 *   - access_control schema contract: `access_mode` accepted, `entries` rejected.
 *   - Unknown / extra top-level and nested properties rejected with 400.
 *   - Partial updates do not clobber unrelated fields.
 *   - GET-after-PUT round-trip parity.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { AuthedApiClient } from '../../../../scout_agent_builder_shared/lib/authed_api_client';
import { apiTest, API_AGENT_BUILDER } from '../fixtures';

/** Minimal valid agent body used as the baseline for all update tests. */
const BASE_AGENT = {
  name: 'Update Test Agent',
  description: 'Baseline agent for update endpoint tests',
  configuration: {
    instructions: 'You are a helpful baseline agent',
    tools: [{ tool_ids: ['*'] }],
  },
};

apiTest.describe(
  'Agent Builder — update agent API (PUT /agents/:id)',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    /** IDs of agents created during this worker run; cleaned up in afterAll. */
    const createdAgentIds: string[] = [];

    /**
     * Create a fresh agent and return its server-assigned ID.
     * The ID is registered for cleanup automatically.
     */
    const createAgent = async (
      asAdmin: AuthedApiClient,
      overrides: Record<string, unknown> = {}
    ): Promise<string> => {
      const id = `update-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const response = await asAdmin.post(`${API_AGENT_BUILDER}/agents`, {
        body: { ...BASE_AGENT, id, ...overrides },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      createdAgentIds.push(id);
      return id;
    };

    apiTest.afterAll(async ({ asAdmin }) => {
      await Promise.allSettled(
        createdAgentIds.map((agentId) =>
          asAdmin.delete(`${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentId)}`)
        )
      );
    });

    // -------------------------------------------------------------------------
    // Happy-path: individual field updates
    // -------------------------------------------------------------------------

    apiTest('updates name and description', async ({ asAdmin }) => {
      const id = await createAgent(asAdmin);

      const response = await asAdmin.put(`${API_AGENT_BUILDER}/agents/${id}`, {
        body: { name: 'Renamed Agent', description: 'Updated description' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({
        id,
        name: 'Renamed Agent',
        description: 'Updated description',
      });
    });

    apiTest('updates labels', async ({ asAdmin }) => {
      const id = await createAgent(asAdmin);

      const response = await asAdmin.put(`${API_AGENT_BUILDER}/agents/${id}`, {
        body: { labels: ['alpha', 'beta', 'gamma'] },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.labels).toStrictEqual(['alpha', 'beta', 'gamma']);
    });

    apiTest('updates avatar_symbol and avatar_color', async ({ asAdmin }) => {
      const id = await createAgent(asAdmin);

      const response = await asAdmin.put(`${API_AGENT_BUILDER}/agents/${id}`, {
        body: { avatar_symbol: 'U', avatar_color: '#FF5733' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ avatar_symbol: 'U', avatar_color: '#FF5733' });
    });

    apiTest(
      'updates configuration.instructions (the overview-page edit-details flow)',
      async ({ asAdmin }) => {
        const id = await createAgent(asAdmin);

        const newInstructions = 'Updated instructions for the agent prompt';
        const response = await asAdmin.put(`${API_AGENT_BUILDER}/agents/${id}`, {
          body: { configuration: { instructions: newInstructions } },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body.configuration.instructions).toBe(newInstructions);
      }
    );

    apiTest('updates configuration.enable_elastic_capabilities', async ({ asAdmin }) => {
      const id = await createAgent(asAdmin);

      const response = await asAdmin.put(`${API_AGENT_BUILDER}/agents/${id}`, {
        body: { configuration: { enable_elastic_capabilities: true } },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.configuration.enable_elastic_capabilities).toBe(true);
    });

    apiTest('updates configuration.workflow_ids', async ({ asAdmin }) => {
      const id = await createAgent(asAdmin);

      const workflowIds = ['workflow-a', 'workflow-b'];
      const response = await asAdmin.put(`${API_AGENT_BUILDER}/agents/${id}`, {
        body: { configuration: { workflow_ids: workflowIds } },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.configuration.workflow_ids).toStrictEqual(workflowIds);
    });

    // -------------------------------------------------------------------------
    // access_control schema contract
    // -------------------------------------------------------------------------

    apiTest('accepts access_control with only access_mode: public', async ({ asAdmin }) => {
      const id = await createAgent(asAdmin);

      const response = await asAdmin.put(`${API_AGENT_BUILDER}/agents/${id}`, {
        body: { access_control: { access_mode: AgentAccessControlMode.Public } },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.access_control.access_mode).toBe(AgentAccessControlMode.Public);
    });

    apiTest('accepts access_control with only access_mode: private', async ({ asAdmin }) => {
      const id = await createAgent(asAdmin);

      const response = await asAdmin.put(`${API_AGENT_BUILDER}/agents/${id}`, {
        body: { access_control: { access_mode: AgentAccessControlMode.Private } },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.access_control.access_mode).toBe(AgentAccessControlMode.Private);
    });

    apiTest(
      'rejects access_control payload that includes entries (regression guard for elastic/search-team#15698)',
      async ({ asAdmin }) => {
        const id = await createAgent(asAdmin);

        // This is the exact payload shape that caused the regression on the
        // overview-page "edit details" flyout — the UI was sending the full
        // access_control object (including entries) instead of just access_mode.
        const response = await asAdmin.put(`${API_AGENT_BUILDER}/agents/${id}`, {
          body: {
            access_control: {
              access_mode: AgentAccessControlMode.Public,
              entries: [],
            },
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
        // The error message must explicitly mention "entries" so callers understand
        // which property was unexpected (matches @kbn/config-schema strict-mode output).
        expect(String((response.body as { message?: string }).message ?? '')).toContain('entries');
      }
    );

    // -------------------------------------------------------------------------
    // Unknown / extra properties
    // -------------------------------------------------------------------------

    apiTest('rejects unknown top-level properties in the update body', async ({ asAdmin }) => {
      const id = await createAgent(asAdmin);

      const response = await asAdmin.put(`${API_AGENT_BUILDER}/agents/${id}`, {
        body: { unknown_field: 'some value' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('rejects unknown nested properties inside configuration', async ({ asAdmin }) => {
      const id = await createAgent(asAdmin);

      const response = await asAdmin.put(`${API_AGENT_BUILDER}/agents/${id}`, {
        body: {
          configuration: {
            instructions: 'Valid instruction',
            unexpected_config_field: true,
          },
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    // -------------------------------------------------------------------------
    // Partial updates — no clobbering
    // -------------------------------------------------------------------------

    apiTest(
      'updating only instructions does not clobber other configuration fields',
      async ({ asAdmin }) => {
        const id = await createAgent(asAdmin, {
          labels: ['keep-me'],
          avatar_symbol: 'K',
          description: 'Original description',
          configuration: {
            instructions: 'Original instructions',
            tools: [{ tool_ids: ['*'] }],
            enable_elastic_capabilities: false,
          },
        });

        // Simulate the exact UI flow that regressed: edit-details flyout sends
        // only the updated instructions inside configuration.
        const putResponse = await asAdmin.put(`${API_AGENT_BUILDER}/agents/${id}`, {
          body: { configuration: { instructions: 'New instructions only' } },
          responseType: 'json',
        });
        expect(putResponse).toHaveStatusCode(200);

        // The instructions must be updated.
        expect(putResponse.body.configuration.instructions).toBe('New instructions only');

        // Top-level fields untouched by the partial update must still be present.
        expect(putResponse.body.labels).toStrictEqual(['keep-me']);
        expect(putResponse.body.avatar_symbol).toBe('K');
        expect(putResponse.body.description).toBe('Original description');

        // Partial config updates must merge, not replace — the other
        // configuration fields must survive an instructions-only update.
        expect(putResponse.body.configuration.tools).toStrictEqual([{ tool_ids: ['*'] }]);
        expect(putResponse.body.configuration.enable_elastic_capabilities).toBe(false);
      }
    );

    apiTest('updating only access_mode does not affect configuration', async ({ asAdmin }) => {
      const id = await createAgent(asAdmin, {
        configuration: {
          instructions: 'Stable instructions',
          tools: [{ tool_ids: ['*'] }],
        },
      });

      const putResponse = await asAdmin.put(`${API_AGENT_BUILDER}/agents/${id}`, {
        body: { access_control: { access_mode: AgentAccessControlMode.Private } },
        responseType: 'json',
      });
      expect(putResponse).toHaveStatusCode(200);
      expect(putResponse.body.configuration.instructions).toBe('Stable instructions');
      expect(putResponse.body.access_control.access_mode).toBe(AgentAccessControlMode.Private);
    });

    // -------------------------------------------------------------------------
    // GET-after-PUT round-trip parity
    // -------------------------------------------------------------------------

    apiTest('GET after PUT returns the same document as the PUT response', async ({ asAdmin }) => {
      const id = await createAgent(asAdmin);

      const putResponse = await asAdmin.put(`${API_AGENT_BUILDER}/agents/${id}`, {
        body: {
          name: 'Round-trip Agent',
          description: 'Round-trip description',
          labels: ['round', 'trip'],
          configuration: { instructions: 'Round-trip instructions' },
        },
        responseType: 'json',
      });
      expect(putResponse).toHaveStatusCode(200);

      const getResponse = await asAdmin.get(`${API_AGENT_BUILDER}/agents/${id}`, {
        responseType: 'json',
      });
      expect(getResponse).toHaveStatusCode(200);

      // Core user-visible fields must match between PUT response and subsequent GET.
      expect(getResponse.body).toMatchObject({
        id,
        name: 'Round-trip Agent',
        description: 'Round-trip description',
        labels: ['round', 'trip'],
      });
      expect(getResponse.body.configuration.instructions).toBe('Round-trip instructions');
    });
  }
);
