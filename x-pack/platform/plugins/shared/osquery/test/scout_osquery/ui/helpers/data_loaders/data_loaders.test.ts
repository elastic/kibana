/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import { OsqueryDataGenerator } from './osquery_data_generator';
import { indexActionResponses } from './index_action_responses';
import { indexResultRows } from './index_result_rows';
import { indexScheduledPackResults } from './index_scheduled_pack_results';
import { mockFleetAgents } from './mock_fleet_agents';

const makeEsClient = (overrides: Record<string, jest.Mock | object> = {}) => ({
  index: jest.fn().mockResolvedValue({ result: 'created' }),
  bulk: jest.fn().mockResolvedValue({ items: [], errors: false }),
  search: jest.fn().mockResolvedValue({ hits: { total: { value: 0 }, hits: [] } }),
  delete: jest.fn().mockResolvedValue({ result: 'deleted' }),
  indices: {
    exists: jest.fn().mockResolvedValue(true),
    create: jest.fn().mockResolvedValue({ acknowledged: true }),
  },
  ...overrides,
});

describe('OsqueryDataGenerator', () => {
  describe('generateAgent', () => {
    it('returns a typed agent with all required fields', () => {
      const gen = new OsqueryDataGenerator();
      const agent = gen.generateAgent();

      expect(typeof agent.agentId).toBe('string');
      expect(agent.agentId).toHaveLength(36); // UUID
      expect(agent.elasticAgentId).toBe(agent.agentId);
      expect(agent.hostName).toMatch(/^scout-osquery-host-/);
      expect(agent.hostIp).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      expect(typeof agent.policyId).toBe('string');
    });

    it('respects overrides', () => {
      const gen = new OsqueryDataGenerator();
      const agent = gen.generateAgent({ agentId: 'my-agent', hostName: 'custom-host' });

      expect(agent.agentId).toBe('my-agent');
      expect(agent.hostName).toBe('custom-host');
    });
  });

  describe('generateAgents', () => {
    it('returns the requested count of unique agents', () => {
      const gen = new OsqueryDataGenerator();
      const agents = gen.generateAgents(3);

      expect(agents).toHaveLength(3);
      const ids = new Set(agents.map((a) => a.agentId));
      expect(ids.size).toBe(3);
    });
  });

  describe('defaultPolicyId', () => {
    it('is stable across calls', () => {
      const gen = new OsqueryDataGenerator({ policyId: 'fixed-policy' });
      expect(gen.defaultPolicyId).toBe('fixed-policy');
      expect(gen.defaultPolicyId).toBe('fixed-policy');
    });
  });
});

describe('indexActionResponses', () => {
  it('writes one response doc per agent', async () => {
    const esClient = makeEsClient();
    const gen = new OsqueryDataGenerator();
    const agents = gen.generateAgents(2);
    const actionId = uuidV4();

    const result = await indexActionResponses(esClient as never, { actionId, agents });

    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    expect(result.data.docs).toHaveLength(2);
    expect(result.data.index).toBe('logs-osquery_manager.action.responses-default');
  });

  it('includes action_response.osquery.count in each doc', async () => {
    const esClient = makeEsClient();
    const gen = new OsqueryDataGenerator();
    const agents = gen.generateAgents(1);
    const actionId = uuidV4();

    await indexActionResponses(esClient as never, { actionId, agents, rowCountPerAgent: 5 });

    const bulkOps = (esClient.bulk as jest.Mock).mock.calls[0][0].operations;
    const docBody = bulkOps[1];
    expect(docBody.action_response.osquery.count).toBe(5);
  });

  it('cleanup deletes by _id', async () => {
    const esClient = makeEsClient();
    const gen = new OsqueryDataGenerator();
    const agents = gen.generateAgents(2);
    const actionId = uuidV4();

    const result = await indexActionResponses(esClient as never, { actionId, agents });
    await result.cleanup();

    expect(esClient.bulk).toHaveBeenCalledTimes(2);
    const cleanupOps = (esClient.bulk as jest.Mock).mock.calls[1][0].operations;
    expect(cleanupOps).toHaveLength(2);
  });
});

describe('indexResultRows', () => {
  it('writes one result row per agent per row entry', async () => {
    const esClient = makeEsClient();
    const gen = new OsqueryDataGenerator();
    const agents = gen.generateAgents(2);
    const actionId = uuidV4();

    const result = await indexResultRows(esClient as never, {
      actionId,
      agents,
      rows: [{ name: 'Linux' }, { name: 'Darwin' }],
    });

    // 2 agents × 2 rows = 4 docs
    expect(result.data.docs).toHaveLength(4);
    expect(result.data.index).toBe('logs-osquery_manager.result-default');
  });

  it('merges ECS fields at root level', async () => {
    const esClient = makeEsClient();
    const gen = new OsqueryDataGenerator();
    const agents = gen.generateAgents(1);
    const actionId = uuidV4();

    await indexResultRows(esClient as never, {
      actionId,
      agents,
      rows: [{}],
      ecsFields: { message: 'hello', tags: 'scout' },
    });

    const bulkOps = (esClient.bulk as jest.Mock).mock.calls[0][0].operations;
    const docBody = bulkOps[1];
    expect(docBody.message).toBe('hello');
    expect(docBody.tags).toBe('scout');
    expect(docBody['agent.name']).toBe(agents[0].hostName);
  });
});

describe('indexScheduledPackResults', () => {
  it('includes schedule_id and execution_count in each doc', async () => {
    const esClient = makeEsClient();
    const gen = new OsqueryDataGenerator();
    const agents = gen.generateAgents(1);
    const scheduleId = uuidV4();

    const result = await indexScheduledPackResults(esClient as never, {
      scheduleId,
      executionCount: 42,
      agents,
      rows: [{}],
    });

    expect(result.data.docs).toHaveLength(1);
    const bulkOps = (esClient.bulk as jest.Mock).mock.calls[0][0].operations;
    const docBody = bulkOps[1];
    expect(docBody.schedule_id).toBe(scheduleId);
    expect(docBody.osquery_meta.schedule_execution_count).toBe(42);
  });
});

describe('mockFleetAgents', () => {
  const makePage = () => ({
    route: jest.fn().mockResolvedValue(undefined),
    unroute: jest.fn().mockResolvedValue(undefined),
  });

  it('registers route handlers for every Fleet wrapper endpoint the picker / flyout consume', async () => {
    const page = makePage();

    await mockFleetAgents(page as never, { count: 2 });

    // List + bulk + agent-detail + policy-list + policy-detail = 5 handlers.
    expect(page.route).toHaveBeenCalledTimes(5);
    const patterns = (page.route as jest.Mock).mock.calls.map((call) => call[0]);
    const sampleUrl = (path: string) => `http://localhost/${path}`;
    const matched = (path: string) =>
      patterns.some((pattern) => pattern instanceof RegExp && pattern.test(sampleUrl(path)));

    expect(matched('internal/osquery/fleet_wrapper/agents')).toBe(true);
    expect(matched('internal/osquery/fleet_wrapper/agents?perPage=20')).toBe(true);
    expect(matched('internal/osquery/fleet_wrapper/agents/abc-123')).toBe(true);
    expect(matched('internal/osquery/fleet_wrapper/agents/_bulk')).toBe(true);
    expect(matched('internal/osquery/fleet_wrapper/agent_policies')).toBe(true);
    expect(matched('internal/osquery/fleet_wrapper/agent_policies/policy-1')).toBe(true);
  });

  it('agent-detail route does not also match the list or bulk paths (no glob over-reach)', async () => {
    const page = makePage();

    await mockFleetAgents(page as never, { count: 1 });

    const detailPattern = (page.route as jest.Mock).mock.calls
      .map((call) => call[0])
      .find((p) => p instanceof RegExp && p.source.includes('(?!_)')) as RegExp;

    expect(detailPattern).toBeDefined();
    expect(detailPattern.test('http://x/internal/osquery/fleet_wrapper/agents')).toBe(false);
    expect(detailPattern.test('http://x/internal/osquery/fleet_wrapper/agents/_bulk')).toBe(false);
    expect(detailPattern.test('http://x/internal/osquery/fleet_wrapper/agents/abc-123')).toBe(true);
  });

  it('exposes a policy detail payload with osquery_manager package_policies enabled', async () => {
    const page = makePage();

    const { agentPolicyDetail } = await mockFleetAgents(page as never, { count: 1 });

    expect(agentPolicyDetail.package_policies).toHaveLength(1);
    expect(agentPolicyDetail.package_policies[0]).toMatchObject({
      enabled: true,
      package: { name: 'osquery_manager' },
    });
  });

  it('returns synthesized agents matching the requested count and shape', async () => {
    const page = makePage();

    const { agents, agentsResponse } = await mockFleetAgents(page as never, { count: 3 });

    expect(agents).toHaveLength(3);
    expect(agentsResponse.total).toBe(3);
    expect(agentsResponse.agents).toHaveLength(3);
    expect(agentsResponse.agents[0]).toMatchObject({
      type: 'PERMANENT',
      active: true,
      status: 'online',
    });
    expect(agentsResponse.agents[0].local_metadata.host.hostname).toBeTruthy();
    expect(agentsResponse.agents[0].local_metadata.os.platform).toBe('linux');
    expect(agentsResponse.agents[0].policy_id).toBe('47a4e64e-5dba-4f7a-9f60-f0a0aa3a1f01');
  });

  it('supports the zero-agent empty state', async () => {
    const page = makePage();

    const { agents, agentsResponse } = await mockFleetAgents(page as never, { count: 0 });

    expect(agents).toHaveLength(0);
    expect(agentsResponse.total).toBe(0);
    expect(agentsResponse.agents).toEqual([]);
    expect(agentsResponse.groups.policies).toEqual([]);
  });

  it('round-robins agents across requested platforms', async () => {
    const page = makePage();

    const { agentsResponse } = await mockFleetAgents(page as never, {
      count: 4,
      platforms: ['linux', 'darwin'],
    });

    const platforms = agentsResponse.agents.map((a) => a.local_metadata.os.platform);
    expect(platforms).toEqual(['linux', 'darwin', 'linux', 'darwin']);
    expect(agentsResponse.groups.platforms.map((p) => p.name).sort()).toEqual(['darwin', 'linux']);
  });

  it('applies the status override to all synthesized agents', async () => {
    const page = makePage();

    const { agentsResponse } = await mockFleetAgents(page as never, {
      count: 2,
      status: 'offline',
    });

    expect(agentsResponse.agents.every((a) => a.status === 'offline')).toBe(true);
  });

  it('assigns explicit hostnames when provided', async () => {
    const page = makePage();

    const { agents, agentsResponse } = await mockFleetAgents(page as never, {
      count: 2,
      hostNames: ['scout-host-alpha', 'scout-host-beta'],
    });

    expect(agents.map((a) => a.hostName)).toEqual(['scout-host-alpha', 'scout-host-beta']);
    expect(agentsResponse.agents.map((a) => a.local_metadata.host.hostname)).toEqual([
      'scout-host-alpha',
      'scout-host-beta',
    ]);
  });

  it('throws when hostNames length does not match count', async () => {
    const page = makePage();

    await expect(
      mockFleetAgents(page as never, { count: 2, hostNames: ['only-one'] })
    ).rejects.toThrow(/hostNames.*length.*must match.*count/);
  });

  it('pins all agents to the provided policy id', async () => {
    const page = makePage();

    const { agentsResponse, agentPoliciesResponse } = await mockFleetAgents(page as never, {
      count: 2,
      policyId: 'osquery-policy-1',
      policyName: 'My Osquery policy',
    });

    expect(agentsResponse.agents.every((a) => a.policy_id === 'osquery-policy-1')).toBe(true);
    expect(agentsResponse.groups.policies[0].id).toBe('osquery-policy-1');
    expect(agentPoliciesResponse[0].id).toBe('osquery-policy-1');
    expect(agentPoliciesResponse[0].name).toBe('My Osquery policy');
  });

  it('rejects non-integer counts', async () => {
    const page = makePage();

    await expect(mockFleetAgents(page as never, { count: -1 })).rejects.toThrow(
      /non-negative integer/
    );
    await expect(mockFleetAgents(page as never, { count: 1.5 })).rejects.toThrow(
      /non-negative integer/
    );
  });

  it('cleanup unroutes every registered handler', async () => {
    const page = makePage();

    const { cleanup } = await mockFleetAgents(page as never, { count: 1 });
    await cleanup();

    // Mirrors the 5 route handlers registered in mockFleetAgents.
    expect(page.unroute).toHaveBeenCalledTimes(5);
  });
});
