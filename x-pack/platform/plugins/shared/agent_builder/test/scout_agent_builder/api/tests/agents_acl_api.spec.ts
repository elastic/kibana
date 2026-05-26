/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import {
  agentBuilderDefaultAgentId,
  AgentAclRole,
  AgentVisibility,
} from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { publicApiPath } from '../../../../common/constants';
import { apiTest } from '../fixtures';
import { COMMON_HEADERS, ELASTIC_API_VERSION, INTERNAL_AGENT_BUILDER } from '../fixtures/constants';
import { spaceUrl } from '../fixtures/space_paths';

const ACL_TEST_PREFIX = 'acl-test';

function mockAgent(id: string, visibility: AgentVisibility = AgentVisibility.Private) {
  return {
    id,
    name: 'ACL Test Agent',
    description: 'Fixture for ACL tests',
    visibility,
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

function agentBuilderRole(aclSpaceId: string, privileges: string[]): KibanaRole {
  return {
    elasticsearch: { cluster: [], indices: [], run_as: [] },
    kibana: [
      {
        base: [],
        feature: { agentBuilder: privileges },
        spaces: [aclSpaceId],
      },
    ],
  };
}

function basicAuthHeader(username: string, password: string): Record<string, string> {
  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

apiTest.describe('Agent Builder — agents ACL API', { tag: [...tags.stateful.classic] }, () => {
  const testRunId = randomUUID();
  const aclSpaceId = `${ACL_TEST_PREFIX}-space-${testRunId}`;
  const aclApiBase = spaceUrl(publicApiPath, aclSpaceId);
  const aclInternalBase = spaceUrl(INTERNAL_AGENT_BUILDER, aclSpaceId);

  // Three native Kibana users, all with `manageAgents`, distinct usernames.
  // Lets us exercise owner-vs-grantee scenarios against a real authn identity.
  const alice = {
    roleName: `${ACL_TEST_PREFIX}-alice-role-${testRunId}`,
    username: `${ACL_TEST_PREFIX}-alice-${testRunId}`,
    password: 'alice-password',
  };
  const bob = {
    roleName: `${ACL_TEST_PREFIX}-bob-role-${testRunId}`,
    username: `${ACL_TEST_PREFIX}-bob-${testRunId}`,
    password: 'bob-password',
  };
  const eve = {
    roleName: `${ACL_TEST_PREFIX}-eve-role-${testRunId}`,
    username: `${ACL_TEST_PREFIX}-eve-${testRunId}`,
    password: 'eve-password',
  };
  // No `manageAgents` — only `minimal_read`. Used to assert privilege-level gates.
  const reader = {
    roleName: `${ACL_TEST_PREFIX}-reader-role-${testRunId}`,
    username: `${ACL_TEST_PREFIX}-reader-${testRunId}`,
    password: 'reader-password',
  };

  const allPrincipals = [alice, bob, eve, reader];

  let adminCookie: Record<string, string>;

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

  apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    adminCookie = cookieHeader;

    await kbnClient.request({
      method: 'POST',
      path: '/api/spaces/space',
      headers: adminPublicHeaders(),
      body: { id: aclSpaceId, name: aclSpaceId, disabledFeatures: [] },
    });

    for (const { roleName } of [alice, bob, eve]) {
      await kbnClient.request({
        method: 'PUT',
        path: `/api/security/role/${encodeURIComponent(roleName)}`,
        headers: adminPublicHeaders(),
        body: agentBuilderRole(aclSpaceId, ['minimal_read', 'manage_agents']),
      });
    }
    await kbnClient.request({
      method: 'PUT',
      path: `/api/security/role/${encodeURIComponent(reader.roleName)}`,
      headers: adminPublicHeaders(),
      body: agentBuilderRole(aclSpaceId, ['minimal_read']),
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
  });

  apiTest.afterAll(async ({ apiClient, kbnClient }) => {
    // Agents first (their authz still uses ES; admin can delete anything).
    for (const agentId of createdAgentIds) {
      await apiClient
        .delete(`${aclApiBase}/agents/${encodeURIComponent(agentId)}`, {
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
        path: `/api/spaces/space/${encodeURIComponent(aclSpaceId)}`,
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
    const res = await apiClient.post(`${aclApiBase}/agents`, {
      headers: headersFor(user),
      body: agent,
      responseType: 'json',
    });
    expect(res).toHaveStatusCode(200);
    trackAgent(agent.id);
    return res;
  };

  const setAclAs = async (
    apiClient: any,
    user: { username: string; password: string },
    agentId: string,
    entries: Array<{ type: 'user'; name: string; role: AgentAclRole }>
  ) => {
    return apiClient.put(`${aclApiBase}/agents/${encodeURIComponent(agentId)}/acl`, {
      headers: headersFor(user),
      body: { entries },
      responseType: 'json',
    });
  };

  // ── read access ─────────────────────────────────────────────────────────

  apiTest('non-owner gets 404 on a Private agent until granted', async ({ apiClient }) => {
    const agentId = `${ACL_TEST_PREFIX}-read-${randomUUID()}`;
    await createAgentAs(apiClient, alice, mockAgent(agentId, AgentVisibility.Private));

    // Bob has no grant.
    const denied = await apiClient.get(`${aclApiBase}/agents/${encodeURIComponent(agentId)}`, {
      headers: headersFor(bob),
      responseType: 'json',
    });
    expect(denied).toHaveStatusCode(404);

    const listBeforeGrant = await apiClient.get(`${aclApiBase}/agents`, {
      headers: headersFor(bob),
      responseType: 'json',
    });
    expect(listBeforeGrant).toHaveStatusCode(200);
    const idsBefore = listBeforeGrant.body.results.map((a: { id: string }) => a.id);
    expect(idsBefore).not.toContain(agentId);

    // Alice grants Bob User access.
    const aclRes = await setAclAs(apiClient, alice, agentId, [
      { type: 'user', name: bob.username, role: AgentAclRole.User },
    ]);
    expect(aclRes).toHaveStatusCode(200);

    const granted = await apiClient.get(`${aclApiBase}/agents/${encodeURIComponent(agentId)}`, {
      headers: headersFor(bob),
      responseType: 'json',
    });
    expect(granted).toHaveStatusCode(200);

    const listAfterGrant = await apiClient.get(`${aclApiBase}/agents`, {
      headers: headersFor(bob),
      responseType: 'json',
    });
    const idsAfter = listAfterGrant.body.results.map((a: { id: string }) => a.id);
    expect(idsAfter).toContain(agentId);
  });

  // ── ACL redaction on agent read paths ───────────────────────────────────

  apiTest('GET /agents/{id} redacts acl.entries for non-managers', async ({ apiClient }) => {
    const agentId = `${ACL_TEST_PREFIX}-redact-${randomUUID()}`;
    await createAgentAs(apiClient, alice, mockAgent(agentId, AgentVisibility.Private));
    const setRes = await setAclAs(apiClient, alice, agentId, [
      { type: 'user', name: bob.username, role: AgentAclRole.User },
      { type: 'user', name: eve.username, role: AgentAclRole.Editor },
    ]);
    expect(setRes).toHaveStatusCode(200);

    // Eve has Editor → manage threshold met → sees the full entries list.
    const eveRes = await apiClient.get(`${aclApiBase}/agents/${encodeURIComponent(agentId)}`, {
      headers: headersFor(eve),
      responseType: 'json',
    });
    expect(eveRes).toHaveStatusCode(200);
    expect(eveRes.body.acl?.entries).toHaveLength(2);

    // Bob has User → manage threshold NOT met → entries redacted.
    const bobRes = await apiClient.get(`${aclApiBase}/agents/${encodeURIComponent(agentId)}`, {
      headers: headersFor(bob),
      responseType: 'json',
    });
    expect(bobRes).toHaveStatusCode(200);
    expect(bobRes.body.acl?.entries).toHaveLength(0);
  });

  // ── /acl endpoint ───────────────────────────────────────────────────────

  apiTest(
    'GET /agents/{id}/acl returns can_manage and redacts entries for non-managers',
    async ({ apiClient }) => {
      const agentId = `${ACL_TEST_PREFIX}-acl-get-${randomUUID()}`;
      await createAgentAs(apiClient, alice, mockAgent(agentId, AgentVisibility.Private));
      await setAclAs(apiClient, alice, agentId, [
        { type: 'user', name: bob.username, role: AgentAclRole.User },
        { type: 'user', name: eve.username, role: AgentAclRole.Editor },
      ]);

      const eveAclRes = await apiClient.get(
        `${aclApiBase}/agents/${encodeURIComponent(agentId)}/acl`,
        { headers: headersFor(eve), responseType: 'json' }
      );
      expect(eveAclRes).toHaveStatusCode(200);
      expect(eveAclRes.body.can_manage).toBe(true);
      expect(eveAclRes.body.acl.entries).toHaveLength(2);

      const bobAclRes = await apiClient.get(
        `${aclApiBase}/agents/${encodeURIComponent(agentId)}/acl`,
        { headers: headersFor(bob), responseType: 'json' }
      );
      expect(bobAclRes).toHaveStatusCode(200);
      expect(bobAclRes.body.can_manage).toBe(false);
      expect(bobAclRes.body.acl.entries).toHaveLength(0);
    }
  );

  // ── PUT /acl authz ──────────────────────────────────────────────────────

  apiTest(
    'PUT /agents/{id}/acl gates on write access (User → 404, Editor → 200)',
    async ({ apiClient }) => {
      const agentId = `${ACL_TEST_PREFIX}-put-${randomUUID()}`;
      await createAgentAs(apiClient, alice, mockAgent(agentId, AgentVisibility.Private));
      await setAclAs(apiClient, alice, agentId, [
        { type: 'user', name: bob.username, role: AgentAclRole.User },
        { type: 'user', name: eve.username, role: AgentAclRole.Editor },
      ]);

      const bobAttempt = await setAclAs(apiClient, bob, agentId, [
        { type: 'user', name: bob.username, role: AgentAclRole.Manager },
      ]);
      expect(bobAttempt).toHaveStatusCode(404);

      const eveAttempt = await setAclAs(apiClient, eve, agentId, [
        { type: 'user', name: bob.username, role: AgentAclRole.Editor },
      ]);
      expect(eveAttempt).toHaveStatusCode(200);
    }
  );

  apiTest(
    'PUT /agents/{id}/acl rejects callers without manageAgents (403)',
    async ({ apiClient }) => {
      const agentId = `${ACL_TEST_PREFIX}-noprivs-${randomUUID()}`;
      await createAgentAs(apiClient, alice, mockAgent(agentId, AgentVisibility.Private));

      const res = await setAclAs(apiClient, reader, agentId, []);
      expect(res).toHaveStatusCode(403);
    }
  );

  // ── default agent immunity ──────────────────────────────────────────────

  apiTest('PUT /acl on the default agent returns 400', async ({ apiClient }) => {
    const res = await apiClient.put(
      `${aclApiBase}/agents/${encodeURIComponent(agentBuilderDefaultAgentId)}/acl`,
      {
        headers: headersFor(alice),
        body: { entries: [{ type: 'user', name: bob.username, role: AgentAclRole.User }] },
        responseType: 'json',
      }
    );
    expect(res).toHaveStatusCode(400);
  });

  // ── cluster admin bypass ────────────────────────────────────────────────

  apiTest(
    'cluster admin can read a Private agent they are not in the ACL of',
    async ({ apiClient, asAdmin }) => {
      const agentId = `${ACL_TEST_PREFIX}-admin-bypass-${randomUUID()}`;
      await createAgentAs(apiClient, alice, mockAgent(agentId, AgentVisibility.Private));

      const res = await asAdmin.get(`${aclApiBase}/agents/${encodeURIComponent(agentId)}`, {
        responseType: 'json',
      });
      expect(res).toHaveStatusCode(200);
    }
  );

  // ── user-picker proxy ──────────────────────────────────────────────────

  apiTest(
    '/_suggest_user_profiles requires manageAgents (reader gets 403)',
    async ({ apiClient }) => {
      const denied = await apiClient.post(`${aclInternalBase}/_suggest_user_profiles`, {
        headers: headersFor(reader),
        body: { name: '' },
        responseType: 'json',
      });
      expect(denied).toHaveStatusCode(403);

      const allowed = await apiClient.post(`${aclInternalBase}/_suggest_user_profiles`, {
        headers: headersFor(eve),
        body: { name: '' },
        responseType: 'json',
      });
      expect(allowed).toHaveStatusCode(200);
    }
  );
});
