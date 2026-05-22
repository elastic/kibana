/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { publicApiPath } from '../../../../common/constants';
import { apiTest } from '../fixtures';
import { COMMON_HEADERS, ELASTIC_API_VERSION } from '../fixtures/constants';
import { spaceUrl } from '../fixtures/space_paths';

const RBAC_TEST_PREFIX = 'rbac-test';

function mockAgent(id: string, toolIds: string[] = ['*']) {
  return {
    id,
    name: 'RBAC Fixture Agent',
    description: 'Fixture for RBAC tests',
    configuration: {
      instructions: 'Test agent',
      tools: [{ tool_ids: toolIds }],
    },
  };
}

function mockToolEsql(id: string) {
  return {
    id,
    type: 'esql' as const,
    description: 'Fixture for RBAC tests',
    tags: [] as string[],
    configuration: {
      query: 'FROM my_index | LIMIT 1',
      params: {} as Record<string, { type: string; description: string }>,
    },
  };
}

function mockToolIndexSearch(id: string, indexName: string) {
  return {
    id,
    type: 'index_search' as const,
    description: 'RBAC test tool',
    tags: [] as string[],
    configuration: {
      pattern: indexName,
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

function agentBuilderRole(rbacSpaceId: string, privileges: string[]): KibanaRole {
  return {
    elasticsearch: { cluster: [], indices: [], run_as: [] },
    kibana: [
      {
        base: [],
        feature: {
          agentBuilder: privileges,
          actions: ['read'],
        },
        spaces: [rbacSpaceId],
      },
    ],
  };
}

function basicAuthHeader(username: string, password: string): Record<string, string> {
  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

function naturalId(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

apiTest.describe(
  'Agent Builder — RBAC',
  {
    tag: [...tags.stateful.classic],
  },
  () => {
    const testRunId = randomUUID();
    const rbacSpaceId = `${RBAC_TEST_PREFIX}-space-${testRunId}`;
    const rbacApiBase = spaceUrl(publicApiPath, rbacSpaceId);
    const rbacTestIndex = `${RBAC_TEST_PREFIX}-index-${testRunId}`;
    const fixtureAgentId = `${RBAC_TEST_PREFIX}-fixture-agent-${testRunId}`;
    const fixtureToolId = `${RBAC_TEST_PREFIX}-fixture-tool-${testRunId}`;

    const readOnlyPrincipal = {
      roleName: `${RBAC_TEST_PREFIX}-read-only-role-${testRunId}`,
      username: `${RBAC_TEST_PREFIX}-read-only-user-${testRunId}`,
    };
    const manageAgentsPrincipal = {
      roleName: `${RBAC_TEST_PREFIX}-manage-agents-role-${testRunId}`,
      username: `${RBAC_TEST_PREFIX}-manage-agents-user-${testRunId}`,
    };
    const manageToolsPrincipal = {
      roleName: `${RBAC_TEST_PREFIX}-manage-tools-role-${testRunId}`,
      username: `${RBAC_TEST_PREFIX}-manage-tools-user-${testRunId}`,
    };
    const allPrincipal = {
      roleName: `${RBAC_TEST_PREFIX}-all-role-${testRunId}`,
      username: `${RBAC_TEST_PREFIX}-all-user-${testRunId}`,
    };

    let adminInteractiveCookieHeader: Record<string, string>;

    const adminInternalSecurityHeaders = () => ({
      ...COMMON_HEADERS,
      ...adminInteractiveCookieHeader,
      'elastic-api-version': ELASTIC_API_VERSION,
    });

    const userHeaders = (username: string, password: string) => ({
      ...COMMON_HEADERS,
      ...basicAuthHeader(username, password),
      'elastic-api-version': ELASTIC_API_VERSION,
    });

    const adminKibanaRequestHeaders = () => ({
      'elastic-api-version': ELASTIC_API_VERSION,
    });

    apiTest.beforeAll(async ({ samlAuth, kbnClient, esClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminInteractiveCookieHeader = cookieHeader;

      await kbnClient.request({
        method: 'POST',
        path: '/api/spaces/space',
        headers: adminKibanaRequestHeaders(),
        body: { id: rbacSpaceId, name: rbacSpaceId, disabledFeatures: [] },
      });

      await esClient.indices.create({ index: rbacTestIndex });

      await kbnClient.request({
        method: 'POST',
        path: `${rbacApiBase}/tools`,
        headers: adminKibanaRequestHeaders(),
        body: mockToolIndexSearch(fixtureToolId, rbacTestIndex),
      });

      await kbnClient.request({
        method: 'POST',
        path: `${rbacApiBase}/agents`,
        headers: adminKibanaRequestHeaders(),
        body: mockAgent(fixtureAgentId, [fixtureToolId]),
      });

      await kbnClient.request({
        method: 'PUT',
        path: `/api/security/role/${encodeURIComponent(readOnlyPrincipal.roleName)}`,
        headers: adminKibanaRequestHeaders(),
        body: agentBuilderRole(rbacSpaceId, ['minimal_read']),
      });
      await kbnClient.request({
        method: 'POST',
        path: `/internal/security/users/${encodeURIComponent(readOnlyPrincipal.username)}`,
        headers: adminInternalSecurityHeaders(),
        body: {
          username: readOnlyPrincipal.username,
          password: 'read-only-password',
          roles: [readOnlyPrincipal.roleName],
          full_name: 'Agent Builder read-only user',
          enabled: true,
        },
      });

      await kbnClient.request({
        method: 'PUT',
        path: `/api/security/role/${encodeURIComponent(manageAgentsPrincipal.roleName)}`,
        headers: adminKibanaRequestHeaders(),
        body: agentBuilderRole(rbacSpaceId, ['minimal_read', 'manage_agents']),
      });
      await kbnClient.request({
        method: 'POST',
        path: `/internal/security/users/${encodeURIComponent(manageAgentsPrincipal.username)}`,
        headers: adminInternalSecurityHeaders(),
        body: {
          username: manageAgentsPrincipal.username,
          password: 'manage-agents-password',
          roles: [manageAgentsPrincipal.roleName],
          full_name: 'Agent Builder manage agents only user',
          enabled: true,
        },
      });

      await kbnClient.request({
        method: 'PUT',
        path: `/api/security/role/${encodeURIComponent(manageToolsPrincipal.roleName)}`,
        headers: adminKibanaRequestHeaders(),
        body: agentBuilderRole(rbacSpaceId, ['minimal_read', 'manage_tools']),
      });
      await kbnClient.request({
        method: 'POST',
        path: `/internal/security/users/${encodeURIComponent(manageToolsPrincipal.username)}`,
        headers: adminInternalSecurityHeaders(),
        body: {
          username: manageToolsPrincipal.username,
          password: 'manage-tools-password',
          roles: [manageToolsPrincipal.roleName],
          full_name: 'Agent Builder manage tools only user',
          enabled: true,
        },
      });

      await kbnClient.request({
        method: 'PUT',
        path: `/api/security/role/${encodeURIComponent(allPrincipal.roleName)}`,
        headers: adminKibanaRequestHeaders(),
        body: agentBuilderRole(rbacSpaceId, ['all']),
      });
      await kbnClient.request({
        method: 'POST',
        path: `/internal/security/users/${encodeURIComponent(allPrincipal.username)}`,
        headers: adminInternalSecurityHeaders(),
        body: {
          username: allPrincipal.username,
          password: 'all-password',
          roles: [allPrincipal.roleName],
          full_name: 'Agent Builder all user',
          enabled: true,
        },
      });
    });

    apiTest.afterAll(async ({ kbnClient, esClient, asAdmin }) => {
      await asAdmin.delete(`${rbacApiBase}/agents/${encodeURIComponent(fixtureAgentId)}`, {
        headers: adminKibanaRequestHeaders(),
      });
      await asAdmin.delete(`${rbacApiBase}/tools/${encodeURIComponent(fixtureToolId)}`, {
        headers: adminKibanaRequestHeaders(),
      });

      for (const { username, roleName } of [
        readOnlyPrincipal,
        manageAgentsPrincipal,
        manageToolsPrincipal,
        allPrincipal,
      ]) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/internal/security/users/${encodeURIComponent(username)}`,
          headers: adminInternalSecurityHeaders(),
        });
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/security/role/${encodeURIComponent(roleName)}`,
          headers: adminKibanaRequestHeaders(),
        });
      }

      await esClient.indices.delete({ index: rbacTestIndex });
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/spaces/space/${encodeURIComponent(rbacSpaceId)}`,
        headers: adminKibanaRequestHeaders(),
      });
    });

    apiTest(
      'minimal_read: can GET agents, agent by id, tools, tool by id',
      async ({ apiClient }) => {
        const u = readOnlyPrincipal.username;
        const p = 'read-only-password';
        const listAgents = await apiClient.get(`${rbacApiBase}/agents`, {
          headers: userHeaders(u, p),
          responseType: 'json',
        });
        expect(listAgents).toHaveStatusCode(200);

        const getAgent = await apiClient.get(
          `${rbacApiBase}/agents/${encodeURIComponent(fixtureAgentId)}`,
          {
            headers: userHeaders(u, p),
            responseType: 'json',
          }
        );
        expect(getAgent).toHaveStatusCode(200);

        const listTools = await apiClient.get(`${rbacApiBase}/tools`, {
          headers: userHeaders(u, p),
          responseType: 'json',
        });
        expect(listTools).toHaveStatusCode(200);

        const getTool = await apiClient.get(
          `${rbacApiBase}/tools/${encodeURIComponent(fixtureToolId)}`,
          {
            headers: userHeaders(u, p),
            responseType: 'json',
          }
        );
        expect(getTool).toHaveStatusCode(200);
      }
    );

    apiTest('minimal_read: cannot mutate agents or tools', async ({ apiClient }) => {
      const u = readOnlyPrincipal.username;
      const p = 'read-only-password';
      const h = userHeaders(u, p);

      const postAgent = await apiClient.post(`${rbacApiBase}/agents`, {
        headers: h,
        body: mockAgent(`${RBAC_TEST_PREFIX}-readonly-create-agent-${testRunId}`),
        responseType: 'json',
      });
      expect(postAgent).toHaveStatusCode(403);

      const putAgent = await apiClient.put(
        `${rbacApiBase}/agents/${encodeURIComponent(fixtureAgentId)}`,
        { headers: h, body: { name: 'Updated' }, responseType: 'json' }
      );
      expect(putAgent).toHaveStatusCode(403);

      const delAgent = await apiClient.delete(
        `${rbacApiBase}/agents/${encodeURIComponent(fixtureAgentId)}`,
        { headers: h, responseType: 'json' }
      );
      expect(delAgent).toHaveStatusCode(403);

      const postTool = await apiClient.post(`${rbacApiBase}/tools`, {
        headers: h,
        body: mockToolEsql(`${RBAC_TEST_PREFIX}-readonly-create-tool-${testRunId}`),
        responseType: 'json',
      });
      expect(postTool).toHaveStatusCode(403);

      const putTool = await apiClient.put(
        `${rbacApiBase}/tools/${encodeURIComponent(fixtureToolId)}`,
        { headers: h, body: { description: 'Updated' }, responseType: 'json' }
      );
      expect(putTool).toHaveStatusCode(403);

      const delTool = await apiClient.delete(
        `${rbacApiBase}/tools/${encodeURIComponent(fixtureToolId)}`,
        { headers: h, responseType: 'json' }
      );
      expect(delTool).toHaveStatusCode(403);
    });

    apiTest('manage_agents: can CRUD agent; cannot mutate tools', async ({ apiClient }) => {
      const u = manageAgentsPrincipal.username;
      const p = 'manage-agents-password';
      const h = userHeaders(u, p);
      const agentId = `rbac-manage-agents-created-agent-${naturalId()}`;

      const createRes = await apiClient.post(`${rbacApiBase}/agents`, {
        headers: h,
        body: mockAgent(agentId),
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      expect((createRes.body as { id: string }).id).toBe(agentId);

      const updateRes = await apiClient.put(
        `${rbacApiBase}/agents/${encodeURIComponent(agentId)}`,
        {
          headers: h,
          body: { name: 'Updated by manage_agents user' },
          responseType: 'json',
        }
      );
      expect(updateRes).toHaveStatusCode(200);

      const deleteRes = await apiClient.delete(
        `${rbacApiBase}/agents/${encodeURIComponent(agentId)}`,
        {
          headers: h,
          responseType: 'json',
        }
      );
      expect(deleteRes).toHaveStatusCode(200);

      const postTool = await apiClient.post(`${rbacApiBase}/tools`, {
        headers: h,
        body: mockToolEsql(`${RBAC_TEST_PREFIX}-manage-agents-create-tool-${testRunId}`),
        responseType: 'json',
      });
      expect(postTool).toHaveStatusCode(403);

      const putTool = await apiClient.put(
        `${rbacApiBase}/tools/${encodeURIComponent(fixtureToolId)}`,
        { headers: h, body: { description: 'Updated' }, responseType: 'json' }
      );
      expect(putTool).toHaveStatusCode(403);

      const delTool = await apiClient.delete(
        `${rbacApiBase}/tools/${encodeURIComponent(fixtureToolId)}`,
        { headers: h, responseType: 'json' }
      );
      expect(delTool).toHaveStatusCode(403);
    });

    apiTest('manage_tools: can CRUD tool; cannot mutate agents', async ({ apiClient }) => {
      const u = manageToolsPrincipal.username;
      const p = 'manage-tools-password';
      const h = userHeaders(u, p);
      const toolId = `rbac-manage-tools-created-tool-${naturalId()}`;

      const createRes = await apiClient.post(`${rbacApiBase}/tools`, {
        headers: h,
        body: mockToolIndexSearch(toolId, rbacTestIndex),
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      expect((createRes.body as { id: string }).id).toBe(toolId);

      const updateRes = await apiClient.put(`${rbacApiBase}/tools/${encodeURIComponent(toolId)}`, {
        headers: h,
        body: { description: 'Updated by manage_tools user' },
        responseType: 'json',
      });
      expect(updateRes).toHaveStatusCode(200);

      const deleteRes = await apiClient.delete(
        `${rbacApiBase}/tools/${encodeURIComponent(toolId)}`,
        {
          headers: h,
          responseType: 'json',
        }
      );
      expect(deleteRes).toHaveStatusCode(200);

      const postAgent = await apiClient.post(`${rbacApiBase}/agents`, {
        headers: h,
        body: mockAgent(`${RBAC_TEST_PREFIX}-manage-tools-create-agent-${testRunId}`),
        responseType: 'json',
      });
      expect(postAgent).toHaveStatusCode(403);

      const putAgent = await apiClient.put(
        `${rbacApiBase}/agents/${encodeURIComponent(fixtureAgentId)}`,
        { headers: h, body: { name: 'Updated' }, responseType: 'json' }
      );
      expect(putAgent).toHaveStatusCode(403);

      const delAgent = await apiClient.delete(
        `${rbacApiBase}/agents/${encodeURIComponent(fixtureAgentId)}`,
        { headers: h, responseType: 'json' }
      );
      expect(delAgent).toHaveStatusCode(403);
    });

    apiTest('agentBuilder all: can create and delete agent and tool', async ({ apiClient }) => {
      const u = allPrincipal.username;
      const p = 'all-password';
      const h = userHeaders(u, p);
      const agentId = `rbac-all-created-agent-${naturalId()}`;
      const toolId = `rbac-all-created-tool-${naturalId()}`;

      const createAgent = await apiClient.post(`${rbacApiBase}/agents`, {
        headers: h,
        body: mockAgent(agentId),
        responseType: 'json',
      });
      expect(createAgent).toHaveStatusCode(200);
      const delAgent = await apiClient.delete(
        `${rbacApiBase}/agents/${encodeURIComponent(agentId)}`,
        {
          headers: h,
          responseType: 'json',
        }
      );
      expect(delAgent).toHaveStatusCode(200);

      const createTool = await apiClient.post(`${rbacApiBase}/tools`, {
        headers: h,
        body: mockToolIndexSearch(toolId, rbacTestIndex),
        responseType: 'json',
      });
      expect(createTool).toHaveStatusCode(200);
      const delTool = await apiClient.delete(`${rbacApiBase}/tools/${encodeURIComponent(toolId)}`, {
        headers: h,
        responseType: 'json',
      });
      expect(delTool).toHaveStatusCode(200);
    });
  }
);
