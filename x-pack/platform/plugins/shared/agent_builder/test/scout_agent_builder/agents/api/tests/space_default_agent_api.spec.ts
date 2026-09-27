/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { ListAgentResponse } from '../../../../../common/http_api/agents';
import type { SpaceSettingsResponse } from '../../../../../common/http_api/space_settings';
import type { AuthedApiClient } from '../../../../scout_agent_builder_shared/lib/authed_api_client';
import { withAuth } from '../../../../scout_agent_builder_shared/lib/authed_api_client';
import { agentBuilderRole } from '../../../../scout_agent_builder_shared/lib/roles';
import {
  apiTest,
  API_AGENT_BUILDER,
  COMMON_HEADERS,
  ELASTIC_API_VERSION,
  INTERNAL_AGENT_BUILDER,
  spaceUrl,
} from '../fixtures';

const TEST_PREFIX = 'space-default-agent-test';

function mockAgent(id: string) {
  return {
    id,
    name: `Space default fixture agent ${id}`,
    description: 'Fixture agent used to test per-space default assignment.',
    access_control: { access_mode: AgentAccessControlMode.Public },
    configuration: {
      instructions: 'You are a test agent.',
      tools: [{ tool_ids: [] as string[] }],
    },
  };
}

apiTest.describe(
  'Agent Builder — per-space default agent',
  { tag: [...tags.stateful.classic] },
  () => {
    const testRunId = randomUUID();
    const SPACE_A = `${TEST_PREFIX}-a-${testRunId}`;
    const SPACE_B = `${TEST_PREFIX}-b-${testRunId}`;

    const shortRunId = testRunId.slice(0, 8);
    const AGENT_IN_A_1 = `sda-agent-a1-${shortRunId}`;
    const AGENT_IN_A_2 = `sda-agent-a2-${shortRunId}`;
    const AGENT_IN_B_1 = `sda-agent-b1-${shortRunId}`;

    // API-key-authed clients for the two Agent Builder personas in SPACE_A
    let asReadOnly: AuthedApiClient;
    let asManageAgents: AuthedApiClient;
    // Kept at module scope so individual tests can rebuild the read-only client
    // from their own `apiClient` fixture (see the 403 test below).
    let readOnlyAuthHeaders: Record<string, string>;

    const adminApiVersionHeaders = () => ({
      'elastic-api-version': ELASTIC_API_VERSION,
    });

    apiTest.beforeAll(async ({ requestAuth, apiClient, kbnClient }) => {
      // Two isolated spaces so we can prove that an assignment in one space
      // does not leak into the other.
      for (const spaceId of [SPACE_A, SPACE_B]) {
        await kbnClient.request({
          method: 'POST',
          path: '/api/spaces/space',
          headers: adminApiVersionHeaders(),
          body: { id: spaceId, name: spaceId, disabledFeatures: [] },
        });
      }

      // Seed multiple agents per space so we can prove the restriction is
      // UI-only: the agents API stays unfiltered even once a default is set.
      for (const [spaceId, agents] of [
        [SPACE_A, [AGENT_IN_A_1, AGENT_IN_A_2]],
        [SPACE_B, [AGENT_IN_B_1]],
      ] as const) {
        for (const agentId of agents) {
          await kbnClient.request({
            method: 'POST',
            path: spaceUrl(`${API_AGENT_BUILDER}/agents`, spaceId),
            headers: adminApiVersionHeaders(),
            body: mockAgent(agentId),
          });
        }
      }

      // Read-only user (no manage_agents) in SPACE_A
      const readOnly = await requestAuth.getApiKeyForCustomRole(
        agentBuilderRole(SPACE_A, ['minimal_read'])
      );
      readOnlyAuthHeaders = {
        ...COMMON_HEADERS,
        ...readOnly.apiKeyHeader,
        'elastic-api-version': ELASTIC_API_VERSION,
      };
      asReadOnly = withAuth(apiClient, readOnlyAuthHeaders);

      const manageAgents = await requestAuth.getApiKeyForCustomRole(
        agentBuilderRole(SPACE_A, ['minimal_read', 'manage_agents'])
      );
      asManageAgents = withAuth(apiClient, {
        ...COMMON_HEADERS,
        ...manageAgents.apiKeyHeader,
        'elastic-api-version': ELASTIC_API_VERSION,
      });
    });

    // Reset the assignment in both spaces after every test so each test is
    // self-contained and order-independent (no shared-state coupling).
    apiTest.afterEach(async ({ asAdmin }) => {
      for (const spaceId of [SPACE_A, SPACE_B]) {
        await asAdmin.put(spaceUrl(`${INTERNAL_AGENT_BUILDER}/space_settings`, spaceId), {
          body: { default_agent_id: null },
          responseType: 'json',
        });
      }
    });

    apiTest.afterAll(async ({ kbnClient, asAdmin }) => {
      // Best-effort cleanup: clear the assignment in each space so the next
      // suite run starts unconfigured even if the space is somehow retained.
      for (const spaceId of [SPACE_A, SPACE_B]) {
        try {
          await asAdmin.put(spaceUrl(`${INTERNAL_AGENT_BUILDER}/space_settings`, spaceId), {
            headers: adminApiVersionHeaders(),
            body: { default_agent_id: null },
            responseType: 'json',
          });
        } catch {
          // Ignore — cleanup is best-effort.
        }
      }

      for (const [spaceId, agents] of [
        [SPACE_A, [AGENT_IN_A_1, AGENT_IN_A_2]],
        [SPACE_B, [AGENT_IN_B_1]],
      ] as const) {
        for (const agentId of agents) {
          try {
            await asAdmin.delete(
              spaceUrl(`${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentId)}`, spaceId),
              { headers: adminApiVersionHeaders() }
            );
          } catch {
            // Ignore — the "clears on delete" test may have removed one already.
          }
        }
      }

      for (const spaceId of [SPACE_A, SPACE_B]) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/spaces/space/${encodeURIComponent(spaceId)}`,
          headers: adminApiVersionHeaders(),
        });
      }
    });

    apiTest('starts with no assignment in a fresh space', async ({ asAdmin }) => {
      // A freshly-created space should not have any assignment persisted.
      const response = await asAdmin.get(
        spaceUrl(`${INTERNAL_AGENT_BUILDER}/space_settings`, SPACE_A),
        { responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      expect((response.body as SpaceSettingsResponse).default_agent_id).toBeNull();
    });

    apiTest(
      'rejects assigning an agent id that does not resolve in the space',
      async ({ asAdmin }) => {
        // We're pinning to an id that only exists in SPACE_B — from SPACE_A's
        // perspective the agent registry cannot resolve it, so the PUT should
        // fail with a 404 without persisting anything.
        const response = await asAdmin.put(
          spaceUrl(`${INTERNAL_AGENT_BUILDER}/space_settings`, SPACE_A),
          {
            body: { default_agent_id: AGENT_IN_B_1 },
            responseType: 'json',
          }
        );
        expect(response).toHaveStatusCode(404);

        const stillEmpty = await asAdmin.get(
          spaceUrl(`${INTERNAL_AGENT_BUILDER}/space_settings`, SPACE_A),
          { responseType: 'json' }
        );
        expect((stillEmpty.body as SpaceSettingsResponse).default_agent_id).toBeNull();
      }
    );

    apiTest(
      'assignment is readable by everyone and does not filter the agents API (UI-only)',
      async ({ asAdmin }) => {
        // Assign AGENT_IN_A_1 in SPACE_A.
        const putRes = await asAdmin.put(
          spaceUrl(`${INTERNAL_AGENT_BUILDER}/space_settings`, SPACE_A),
          {
            body: { default_agent_id: AGENT_IN_A_1 },
            responseType: 'json',
          }
        );
        expect(putRes).toHaveStatusCode(200);
        expect((putRes.body as SpaceSettingsResponse).default_agent_id).toBe(AGENT_IN_A_1);

        // A restricted (no manage_agents) user can READ the assignment so the
        // UI knows which agent to pin them to.
        const settingsAsReadOnly = await asReadOnly.get(
          spaceUrl(`${INTERNAL_AGENT_BUILDER}/space_settings`, SPACE_A),
          { responseType: 'json' }
        );
        expect(settingsAsReadOnly).toHaveStatusCode(200);
        expect((settingsAsReadOnly.body as SpaceSettingsResponse).default_agent_id).toBe(
          AGENT_IN_A_1
        );

        // The restriction is UI-only: the agents API is NOT filtered server
        // side, so the restricted user still sees every agent they can access.
        const listAsReadOnly = await asReadOnly.get(
          spaceUrl(`${API_AGENT_BUILDER}/agents`, SPACE_A),
          { responseType: 'json' }
        );
        expect(listAsReadOnly).toHaveStatusCode(200);
        const restrictedAgentIds = (listAsReadOnly.body as ListAgentResponse).results.map(
          (agent) => agent.id
        );
        // The list is NOT filtered to the space default, so both seeded agents
        // are present. Assert a subset (not strict-equal) so built-in agents
        // like `elastic-ai-agent` do not break the test.
        expect(restrictedAgentIds).toStrictEqual(
          expect.arrayContaining([AGENT_IN_A_1, AGENT_IN_A_2])
        );

        // The manage_agents user also sees both agents.
        const listAsManager = await asManageAgents.get(
          spaceUrl(`${API_AGENT_BUILDER}/agents`, SPACE_A),
          { responseType: 'json' }
        );
        expect(listAsManager).toHaveStatusCode(200);
        const managerAgentIds = (listAsManager.body as ListAgentResponse).results.map(
          (agent) => agent.id
        );
        expect(managerAgentIds).toStrictEqual(expect.arrayContaining([AGENT_IN_A_1, AGENT_IN_A_2]));
      }
    );

    apiTest('another space is unaffected by SPACE_A assignment', async ({ asAdmin }) => {
      // SPACE_B should remain unconfigured even after SPACE_A was assigned.
      const response = await asAdmin.get(
        spaceUrl(`${INTERNAL_AGENT_BUILDER}/space_settings`, SPACE_B),
        { responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      expect((response.body as SpaceSettingsResponse).default_agent_id).toBeNull();
    });

    apiTest('restricted users cannot mutate the space assignment (403)', async ({ apiClient }) => {
      // The read-only role has no `manage_agents` privilege — PUT must fail.
      // Rebuild the authed client from this test's `apiClient` fixture so the
      // request is issued through the fixture rather than a module-scoped alias.
      const asRestricted = withAuth(apiClient, readOnlyAuthHeaders);
      const response = await asRestricted.put(
        spaceUrl(`${INTERNAL_AGENT_BUILDER}/space_settings`, SPACE_A),
        {
          body: { default_agent_id: AGENT_IN_A_2 },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(403);
    });

    apiTest(
      'does not auto-clear the assignment when the pinned agent is deleted',
      async ({ asAdmin, kbnClient }) => {
        // The server intentionally does not eagerly clear a dangling assignment;
        // the client-side cross-check in `useEffectiveSpaceDefaultAgent` degrades
        // it to "unconfigured" for users, and an admin can re-assign or clear it.
        //
        // Use a throwaway agent created + pinned + deleted within this test so it
        // is self-contained and does not consume a shared fixture agent.
        const throwawayId = `sda-agent-del-${shortRunId}`;
        await kbnClient.request({
          method: 'POST',
          path: spaceUrl(`${API_AGENT_BUILDER}/agents`, SPACE_A),
          headers: adminApiVersionHeaders(),
          body: mockAgent(throwawayId),
        });
        await asAdmin.put(spaceUrl(`${INTERNAL_AGENT_BUILDER}/space_settings`, SPACE_A), {
          body: { default_agent_id: throwawayId },
          responseType: 'json',
        });

        // The agents DELETE route is versioned, so it needs the api-version header.
        const deleteRes = await asAdmin.delete(
          spaceUrl(`${API_AGENT_BUILDER}/agents/${encodeURIComponent(throwawayId)}`, SPACE_A),
          { headers: adminApiVersionHeaders(), responseType: 'json' }
        );
        expect(deleteRes).toHaveStatusCode(200);

        const settings = await asAdmin.get(
          spaceUrl(`${INTERNAL_AGENT_BUILDER}/space_settings`, SPACE_A),
          { responseType: 'json' }
        );
        expect(settings).toHaveStatusCode(200);
        // Raw stored id returned unchanged (dangling), not auto-nulled.
        expect((settings.body as SpaceSettingsResponse).default_agent_id).toBe(throwawayId);
      }
    );

    apiTest('clearing an assignment explicitly succeeds', async ({ asAdmin }) => {
      // Set then clear to verify the null-clear path independently of the
      // "cleared on delete" flow.
      await asAdmin.put(spaceUrl(`${INTERNAL_AGENT_BUILDER}/space_settings`, SPACE_A), {
        body: { default_agent_id: AGENT_IN_A_2 },
        responseType: 'json',
      });

      const clearRes = await asAdmin.put(
        spaceUrl(`${INTERNAL_AGENT_BUILDER}/space_settings`, SPACE_A),
        {
          body: { default_agent_id: null },
          responseType: 'json',
        }
      );
      expect(clearRes).toHaveStatusCode(200);
      expect((clearRes.body as SpaceSettingsResponse).default_agent_id).toBeNull();
    });
  }
);
