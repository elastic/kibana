/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Client } from '@elastic/elasticsearch';
import {
  agentBuilderDefaultAgentId,
  AgentAccessControlRole,
  AgentAccessControlScope,
  AgentType,
} from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createSystemIndicesEsClient } from '../../../scout_agent_builder_shared/lib/system_indices_es_client';
import { publicApiPath } from '../../../../common/constants';
import { apiTest } from '../fixtures';
import {
  CHAT_AGENTS_INDEX,
  COMMON_HEADERS,
  ELASTIC_API_VERSION,
  INTERNAL_AGENT_BUILDER,
} from '../fixtures/constants';
import { spaceUrl } from '../fixtures/space_paths';

const ACCESS_CONTROL_TEST_PREFIX = 'access-control-test';

function mockAgent(id: string, scope: AgentAccessControlScope = AgentAccessControlScope.Private) {
  return {
    id,
    name: 'Access Control Test Agent',
    description: 'Fixture for access control tests',
    // Create accepts scope only; entries are managed via PUT /access_control.
    access_control: { scope },
    configuration: {
      instructions: 'Test agent',
      tools: [{ tool_ids: ['*'] }],
    },
  };
}

interface KibanaRole {
  elasticsearch?: { cluster?: string[]; indices?: unknown[]; run_as?: string[] };
  kibana?: Array<{
    base?: string[];
    feature?: Record<string, string[]>;
    spaces: string[];
  }>;
}

function agentBuilderRole(accessControlSpaceId: string, privileges: string[]): KibanaRole {
  return {
    elasticsearch: { cluster: [], indices: [], run_as: [] },
    kibana: [
      {
        base: [],
        feature: { agentBuilder: privileges },
        spaces: [accessControlSpaceId],
      },
    ],
  };
}

function basicAuthHeader(username: string, password: string): Record<string, string> {
  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

apiTest.describe(
  'Agent Builder — agents access-control API',
  { tag: [...tags.stateful.classic] },
  () => {
    const testRunId = randomUUID();
    const accessControlSpaceId = `${ACCESS_CONTROL_TEST_PREFIX}-space-${testRunId}`;
    const accessControlApiBase = spaceUrl(publicApiPath, accessControlSpaceId);
    const accessControlInternalBase = spaceUrl(INTERNAL_AGENT_BUILDER, accessControlSpaceId);

    // Three native Kibana users, all with `manageAgents`, distinct usernames.
    // Lets us exercise owner-vs-grantee scenarios against a real authn identity.
    const alice = {
      roleName: `${ACCESS_CONTROL_TEST_PREFIX}-alice-role-${testRunId}`,
      username: `${ACCESS_CONTROL_TEST_PREFIX}-alice-${testRunId}`,
      password: 'alice-password',
    };
    const bob = {
      roleName: `${ACCESS_CONTROL_TEST_PREFIX}-bob-role-${testRunId}`,
      username: `${ACCESS_CONTROL_TEST_PREFIX}-bob-${testRunId}`,
      password: 'bob-password',
    };
    const eve = {
      roleName: `${ACCESS_CONTROL_TEST_PREFIX}-eve-role-${testRunId}`,
      username: `${ACCESS_CONTROL_TEST_PREFIX}-eve-${testRunId}`,
      password: 'eve-password',
    };
    // No `manageAgents` — only `minimal_read`. Used to assert privilege-level gates.
    const reader = {
      roleName: `${ACCESS_CONTROL_TEST_PREFIX}-reader-role-${testRunId}`,
      username: `${ACCESS_CONTROL_TEST_PREFIX}-reader-${testRunId}`,
      password: 'reader-password',
    };

    const allPrincipals = [alice, bob, eve, reader];

    let adminCookie: Record<string, string>;
    let sysEsClient: Client;

    const headersFor = (user: { username: string; password: string }) => ({
      ...COMMON_HEADERS,
      ...basicAuthHeader(user.username, user.password),
      'elastic-api-version': ELASTIC_API_VERSION,
    });
    const adminInternalHeaders = () => ({
      ...COMMON_HEADERS,
      ...adminCookie,
      'elastic-api-version': ELASTIC_API_VERSION,
    });
    const adminPublicHeaders = () => ({ 'elastic-api-version': ELASTIC_API_VERSION });

    const createdAgentIds = new Set<string>();
    const trackAgent = (id: string) => {
      createdAgentIds.add(id);
      return id;
    };

    apiTest.beforeAll(async ({ asAdmin, config, esClient, samlAuth, kbnClient }) => {
      sysEsClient = await createSystemIndicesEsClient(esClient, config);
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminCookie = cookieHeader;

      await kbnClient.request({
        method: 'POST',
        path: '/api/spaces/space',
        headers: adminPublicHeaders(),
        body: { id: accessControlSpaceId, name: accessControlSpaceId, disabledFeatures: [] },
      });

      for (const { roleName } of [alice, bob, eve]) {
        await kbnClient.request({
          method: 'PUT',
          path: `/api/security/role/${encodeURIComponent(roleName)}`,
          headers: adminPublicHeaders(),
          body: agentBuilderRole(accessControlSpaceId, ['minimal_read', 'manage_agents']),
        });
      }
      await kbnClient.request({
        method: 'PUT',
        path: `/api/security/role/${encodeURIComponent(reader.roleName)}`,
        headers: adminPublicHeaders(),
        body: agentBuilderRole(accessControlSpaceId, ['minimal_read']),
      });

      for (const user of allPrincipals) {
        await kbnClient.request({
          method: 'POST',
          path: `/internal/security/users/${encodeURIComponent(user.username)}`,
          headers: adminInternalHeaders(),
          body: {
            username: user.username,
            password: user.password,
            roles: [user.roleName],
            full_name: user.username,
            enabled: true,
          },
        });
      }

      const bootstrapAgentId = trackAgent(`${ACCESS_CONTROL_TEST_PREFIX}-bootstrap-${testRunId}`);
      await asAdmin.post(`${accessControlApiBase}/agents`, {
        body: mockAgent(bootstrapAgentId),
        responseType: 'json',
      });
    });

    apiTest.afterAll(async ({ apiClient, kbnClient }) => {
      // Agents first (their authz still uses ES; admin can delete anything).
      for (const agentId of createdAgentIds) {
        await apiClient
          .delete(`${accessControlApiBase}/agents/${encodeURIComponent(agentId)}`, {
            headers: adminInternalHeaders(),
          })
          .catch(() => {});
      }
      for (const user of allPrincipals) {
        await kbnClient
          .request({
            method: 'DELETE',
            path: `/internal/security/users/${encodeURIComponent(user.username)}`,
            headers: adminInternalHeaders(),
          })
          .catch(() => {});
        await kbnClient
          .request({
            method: 'DELETE',
            path: `/api/security/role/${encodeURIComponent(user.roleName)}`,
            headers: adminPublicHeaders(),
          })
          .catch(() => {});
      }
      await kbnClient
        .request({
          method: 'DELETE',
          path: `/api/spaces/space/${encodeURIComponent(accessControlSpaceId)}`,
          headers: adminPublicHeaders(),
        })
        .catch(() => {});
    });

    // ── helpers ─────────────────────────────────────────────────────────────

    const createAgentAs = async (
      apiClient: any,
      user: { username: string; password: string },
      agent: ReturnType<typeof mockAgent>
    ) => {
      const res = await apiClient.post(`${accessControlApiBase}/agents`, {
        headers: headersFor(user),
        body: agent,
        responseType: 'json',
      });
      expect(res).toHaveStatusCode(200);
      trackAgent(agent.id);
      return res;
    };

    const setAccessControlAs = async (
      apiClient: any,
      user: { username: string; password: string },
      agentId: string,
      entries: Array<{ type: 'user'; name: string; role: AgentAccessControlRole }>
    ) => {
      return apiClient.put(
        `${accessControlApiBase}/agents/${encodeURIComponent(agentId)}/access_control`,
        {
          headers: headersFor(user),
          body: { entries },
          responseType: 'json',
        }
      );
    };

    const seedLegacyAgent = async ({
      agentId,
      visibility,
      entries = [],
    }: {
      agentId: string;
      visibility: AgentAccessControlScope;
      entries?: Array<{ type: 'user'; name: string; role: AgentAccessControlRole }>;
    }) => {
      const timestamp = new Date().toISOString();
      await sysEsClient.index({
        index: CHAT_AGENTS_INDEX,
        id: agentId,
        refresh: 'wait_for',
        document: {
          id: agentId,
          name: 'Legacy Access Control Test Agent',
          type: AgentType.chat,
          space: accessControlSpaceId,
          description: 'Legacy fixture for access control tests',
          created_by_name: alice.username,
          visibility,
          acl: { entries },
          config: {
            instructions: 'Legacy test agent',
            tools: [{ tool_ids: ['*'] }],
          },
          created_at: timestamp,
          updated_at: timestamp,
        },
      });
      trackAgent(agentId);
    };

    // ── read access ─────────────────────────────────────────────────────────

    apiTest('non-owner gets 404 on a Private agent until granted', async ({ apiClient }) => {
      const agentId = `${ACCESS_CONTROL_TEST_PREFIX}-read-${randomUUID()}`;
      await createAgentAs(apiClient, alice, mockAgent(agentId, AgentAccessControlScope.Private));

      // Bob has no grant.
      const denied = await apiClient.get(
        `${accessControlApiBase}/agents/${encodeURIComponent(agentId)}`,
        {
          headers: headersFor(bob),
          responseType: 'json',
        }
      );
      expect(denied).toHaveStatusCode(404);

      const listBeforeGrant = await apiClient.get(`${accessControlApiBase}/agents`, {
        headers: headersFor(bob),
        responseType: 'json',
      });
      expect(listBeforeGrant).toHaveStatusCode(200);
      const idsBefore = listBeforeGrant.body.results.map((a: { id: string }) => a.id);
      expect(idsBefore).not.toContain(agentId);

      // Alice grants Bob User access.
      const accessControlRes = await setAccessControlAs(apiClient, alice, agentId, [
        { type: 'user', name: bob.username, role: AgentAccessControlRole.User },
      ]);
      expect(accessControlRes).toHaveStatusCode(200);

      const granted = await apiClient.get(
        `${accessControlApiBase}/agents/${encodeURIComponent(agentId)}`,
        {
          headers: headersFor(bob),
          responseType: 'json',
        }
      );
      expect(granted).toHaveStatusCode(200);

      const listAfterGrant = await apiClient.get(`${accessControlApiBase}/agents`, {
        headers: headersFor(bob),
        responseType: 'json',
      });
      const idsAfter = listAfterGrant.body.results.map((a: { id: string }) => a.id);
      expect(idsAfter).toContain(agentId);
    });

    apiTest(
      'legacy visibility and acl are honored for read, list, and access-control APIs',
      async ({ apiClient }) => {
        const deniedAgentId = `${ACCESS_CONTROL_TEST_PREFIX}-legacy-denied-${randomUUID()}`;
        const grantedAgentId = `${ACCESS_CONTROL_TEST_PREFIX}-legacy-granted-${randomUUID()}`;

        await seedLegacyAgent({
          agentId: deniedAgentId,
          visibility: AgentAccessControlScope.Private,
        });
        await seedLegacyAgent({
          agentId: grantedAgentId,
          visibility: AgentAccessControlScope.Private,
          entries: [
            { type: 'user', name: bob.username, role: AgentAccessControlRole.User },
            { type: 'user', name: eve.username, role: AgentAccessControlRole.Editor },
          ],
        });

        const denied = await apiClient.get(
          `${accessControlApiBase}/agents/${encodeURIComponent(deniedAgentId)}`,
          {
            headers: headersFor(bob),
            responseType: 'json',
          }
        );
        expect(denied).toHaveStatusCode(404);

        const granted = await apiClient.get(
          `${accessControlApiBase}/agents/${encodeURIComponent(grantedAgentId)}`,
          {
            headers: headersFor(bob),
            responseType: 'json',
          }
        );
        expect(granted).toHaveStatusCode(200);
        expect(granted.body.access_control).toMatchObject({
          scope: AgentAccessControlScope.Private,
          entries: [],
        });

        const list = await apiClient.get(`${accessControlApiBase}/agents`, {
          headers: headersFor(bob),
          responseType: 'json',
        });
        expect(list).toHaveStatusCode(200);
        const listedIds = list.body.results.map((agent: { id: string }) => agent.id);
        expect(listedIds).not.toContain(deniedAgentId);
        expect(listedIds).toContain(grantedAgentId);

        const bobAccessControl = await apiClient.get(
          `${accessControlApiBase}/agents/${encodeURIComponent(grantedAgentId)}/access_control`,
          { headers: headersFor(bob), responseType: 'json' }
        );
        expect(bobAccessControl).toHaveStatusCode(200);
        expect(bobAccessControl.body.can_manage_access_control).toBe(false);
        expect(bobAccessControl.body.access_control.entries).toHaveLength(0);

        const eveAccessControl = await apiClient.get(
          `${accessControlApiBase}/agents/${encodeURIComponent(grantedAgentId)}/access_control`,
          { headers: headersFor(eve), responseType: 'json' }
        );
        expect(eveAccessControl).toHaveStatusCode(200);
        expect(eveAccessControl.body.can_manage_access_control).toBe(true);
        expect(eveAccessControl.body.access_control.entries).toHaveLength(2);
      }
    );

    // ── access control redaction on agent read paths ───────────────────────────────────

    apiTest(
      'GET /agents/{id} redacts access_control.entries for non-managers',
      async ({ apiClient }) => {
        const agentId = `${ACCESS_CONTROL_TEST_PREFIX}-redact-${randomUUID()}`;
        await createAgentAs(apiClient, alice, mockAgent(agentId, AgentAccessControlScope.Private));
        const setRes = await setAccessControlAs(apiClient, alice, agentId, [
          { type: 'user', name: bob.username, role: AgentAccessControlRole.User },
          { type: 'user', name: eve.username, role: AgentAccessControlRole.Editor },
        ]);
        expect(setRes).toHaveStatusCode(200);

        // Eve has Editor → manage threshold met → sees the full entries list.
        const eveRes = await apiClient.get(
          `${accessControlApiBase}/agents/${encodeURIComponent(agentId)}`,
          {
            headers: headersFor(eve),
            responseType: 'json',
          }
        );
        expect(eveRes).toHaveStatusCode(200);
        expect(eveRes.body.access_control?.entries).toHaveLength(2);

        // Bob has User → manage threshold NOT met → entries redacted.
        const bobRes = await apiClient.get(
          `${accessControlApiBase}/agents/${encodeURIComponent(agentId)}`,
          {
            headers: headersFor(bob),
            responseType: 'json',
          }
        );
        expect(bobRes).toHaveStatusCode(200);
        expect(bobRes.body.access_control?.entries).toHaveLength(0);
      }
    );

    // ── /access_control endpoint ───────────────────────────────────────────────────────

    apiTest(
      'GET /agents/{id}/access_control returns can_manage_access_control and redacts entries for non-managers',
      async ({ apiClient }) => {
        const agentId = `${ACCESS_CONTROL_TEST_PREFIX}-get-${randomUUID()}`;
        await createAgentAs(apiClient, alice, mockAgent(agentId, AgentAccessControlScope.Private));
        await setAccessControlAs(apiClient, alice, agentId, [
          { type: 'user', name: bob.username, role: AgentAccessControlRole.User },
          { type: 'user', name: eve.username, role: AgentAccessControlRole.Editor },
        ]);

        const eveAccessControlRes = await apiClient.get(
          `${accessControlApiBase}/agents/${encodeURIComponent(agentId)}/access_control`,
          { headers: headersFor(eve), responseType: 'json' }
        );
        expect(eveAccessControlRes).toHaveStatusCode(200);
        expect(eveAccessControlRes.body.can_manage_access_control).toBe(true);
        expect(eveAccessControlRes.body.access_control.entries).toHaveLength(2);

        const bobAccessControlRes = await apiClient.get(
          `${accessControlApiBase}/agents/${encodeURIComponent(agentId)}/access_control`,
          { headers: headersFor(bob), responseType: 'json' }
        );
        expect(bobAccessControlRes).toHaveStatusCode(200);
        expect(bobAccessControlRes.body.can_manage_access_control).toBe(false);
        expect(bobAccessControlRes.body.access_control.entries).toHaveLength(0);
      }
    );

    // ── PUT /access_control authz ──────────────────────────────────────────────────────

    apiTest(
      'PUT /agents/{id}/access_control gates on write access (User → 404, Editor → 200)',
      async ({ apiClient }) => {
        const agentId = `${ACCESS_CONTROL_TEST_PREFIX}-put-${randomUUID()}`;
        await createAgentAs(apiClient, alice, mockAgent(agentId, AgentAccessControlScope.Private));
        await setAccessControlAs(apiClient, alice, agentId, [
          { type: 'user', name: bob.username, role: AgentAccessControlRole.User },
          { type: 'user', name: eve.username, role: AgentAccessControlRole.Editor },
        ]);

        const bobAttempt = await setAccessControlAs(apiClient, bob, agentId, [
          { type: 'user', name: bob.username, role: AgentAccessControlRole.Manager },
        ]);
        expect(bobAttempt).toHaveStatusCode(404);

        const eveAttempt = await setAccessControlAs(apiClient, eve, agentId, [
          { type: 'user', name: bob.username, role: AgentAccessControlRole.Editor },
        ]);
        expect(eveAttempt).toHaveStatusCode(200);
      }
    );

    apiTest('legacy Manager acl can change access-control scope', async ({ apiClient }) => {
      const agentId = `${ACCESS_CONTROL_TEST_PREFIX}-legacy-scope-${randomUUID()}`;
      await seedLegacyAgent({
        agentId,
        visibility: AgentAccessControlScope.Private,
        entries: [{ type: 'user', name: bob.username, role: AgentAccessControlRole.Manager }],
      });

      const response = await apiClient.put(
        `${accessControlApiBase}/agents/${encodeURIComponent(agentId)}`,
        {
          headers: headersFor(bob),
          body: { access_control: { scope: AgentAccessControlScope.Shared } },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.access_control).toMatchObject({
        scope: AgentAccessControlScope.Shared,
        entries: [{ type: 'user', name: bob.username, role: AgentAccessControlRole.Manager }],
      });
    });

    apiTest(
      'PUT /agents/{id}/access_control rejects callers without manageAgents (403)',
      async ({ apiClient }) => {
        const agentId = `${ACCESS_CONTROL_TEST_PREFIX}-noprivs-${randomUUID()}`;
        await createAgentAs(apiClient, alice, mockAgent(agentId, AgentAccessControlScope.Private));

        const res = await setAccessControlAs(apiClient, reader, agentId, []);
        expect(res).toHaveStatusCode(403);
      }
    );

    // ── default agent immunity ──────────────────────────────────────────────

    apiTest('PUT /access_control on the default agent returns 400', async ({ apiClient }) => {
      const res = await apiClient.put(
        `${accessControlApiBase}/agents/${encodeURIComponent(
          agentBuilderDefaultAgentId
        )}/access_control`,
        {
          headers: headersFor(alice),
          body: {
            entries: [{ type: 'user', name: bob.username, role: AgentAccessControlRole.User }],
          },
          responseType: 'json',
        }
      );
      expect(res).toHaveStatusCode(400);
    });

    // ── cluster admin bypass ────────────────────────────────────────────────

    apiTest(
      'cluster admin can read a Private agent they are not in the access control of',
      async ({ apiClient, asAdmin }) => {
        const agentId = `${ACCESS_CONTROL_TEST_PREFIX}-admin-${randomUUID()}`;
        await createAgentAs(apiClient, alice, mockAgent(agentId, AgentAccessControlScope.Private));

        const res = await asAdmin.get(
          `${accessControlApiBase}/agents/${encodeURIComponent(agentId)}`,
          {
            responseType: 'json',
          }
        );
        expect(res).toHaveStatusCode(200);
      }
    );

    // ── user-picker proxy ──────────────────────────────────────────────────

    apiTest(
      '/_suggest_user_profiles requires manageAgents (reader gets 403)',
      async ({ apiClient }) => {
        const denied = await apiClient.post(`${accessControlInternalBase}/_suggest_user_profiles`, {
          headers: headersFor(reader),
          body: { name: '' },
          responseType: 'json',
        });
        expect(denied).toHaveStatusCode(403);

        const allowed = await apiClient.post(
          `${accessControlInternalBase}/_suggest_user_profiles`,
          {
            headers: headersFor(eve),
            body: { name: '' },
            responseType: 'json',
          }
        );
        expect(allowed).toHaveStatusCode(200);
      }
    );
  }
);
