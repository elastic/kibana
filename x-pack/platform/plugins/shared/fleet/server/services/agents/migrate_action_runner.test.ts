/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { Agent } from '../../types';

import { createAgentAction, createErrorActionResults } from './actions';
import { bulkMigrateAgentsBatch, partitionAgentsForMigration } from './migrate_action_runner';

jest.mock('./actions', () => ({
  createAgentAction: jest.fn(),
  createErrorActionResults: jest.fn(),
}));

jest.mock('./crud', () => ({
  getAgentPolicyForAgents: jest.fn().mockResolvedValue([
    { id: 'protected-policy', is_protected: true },
    { id: 'open-policy', is_protected: false },
    { id: 'agentless-policy', is_protected: false, supports_agentless: true },
  ]),
}));

const makeAgent = (overrides: Partial<Agent>): Agent =>
  ({
    id: 'agent-1',
    active: true,
    status: 'online',
    type: 'PERMANENT',
    enrolled_at: '2024-01-01T00:00:00Z',
    local_metadata: {
      elastic: { agent: { version: '9.2.0', upgradeable: true } },
    },
    ...overrides,
  } as Agent);

describe('partitionAgentsForMigration', () => {
  const soClient = savedObjectsClientMock.create();

  it('blocks non-variant agent on protected policy', async () => {
    const agent = makeAgent({
      id: 'agent-protected',
      policy_id: 'protected-policy',
      policy_base_id: 'protected-policy',
    });
    const { agentsToAction, errors } = await partitionAgentsForMigration(soClient, [agent]);
    expect(agentsToAction).toHaveLength(0);
    expect(errors['agent-protected'].message).toContain('protected');
  });

  it('allows non-variant agent on non-protected policy', async () => {
    const agent = makeAgent({
      id: 'agent-open',
      policy_id: 'open-policy',
      policy_base_id: 'open-policy',
    });
    const { agentsToAction, errors } = await partitionAgentsForMigration(soClient, [agent]);
    expect(agentsToAction).toContain(agent);
    expect(errors['agent-open']).toBeUndefined();
  });

  it('blocks agentless agent, including on a variant of an agentless policy', async () => {
    const agent = makeAgent({
      id: 'agent-agentless',
      policy_id: 'agentless-policy',
      policy_base_id: 'agentless-policy',
    });
    const variantAgent = makeAgent({
      id: 'agent-agentless-variant',
      policy_id: 'agentless-policy#9.2',
      policy_base_id: 'agentless-policy',
    });
    const { agentsToAction, errors } = await partitionAgentsForMigration(soClient, [
      agent,
      variantAgent,
    ]);
    expect(agentsToAction).toHaveLength(0);
    expect(errors['agent-agentless'].message).toContain('managed agent');
    expect(errors['agent-agentless-variant'].message).toContain('managed agent');
  });

  describe('version-specific variant agents', () => {
    it('blocks variant agent on protected base policy', async () => {
      const agent = makeAgent({
        id: 'agent-variant-protected',
        policy_id: 'protected-policy#9.2',
        policy_base_id: 'protected-policy',
      });
      const { agentsToAction, errors } = await partitionAgentsForMigration(soClient, [agent]);
      expect(agentsToAction).toHaveLength(0);
      expect(errors['agent-variant-protected'].message).toContain('protected');
    });

    it('allows variant agent on non-protected base policy', async () => {
      const agent = makeAgent({
        id: 'agent-variant-open',
        policy_id: 'open-policy#9.2',
        policy_base_id: 'open-policy',
      });
      const { agentsToAction, errors } = await partitionAgentsForMigration(soClient, [agent]);
      expect(agentsToAction).toContain(agent);
      expect(errors['agent-variant-open']).toBeUndefined();
    });

    it('blocks variant with multi-part minor version (#9.10) on protected policy', async () => {
      const agent = makeAgent({
        id: 'agent-variant-910',
        policy_id: 'protected-policy#9.10',
        policy_base_id: 'protected-policy',
      });
      const { agentsToAction, errors } = await partitionAgentsForMigration(soClient, [agent]);
      expect(agentsToAction).toHaveLength(0);
      expect(errors['agent-variant-910'].message).toContain('protected');
    });
  });
});

describe('bulkMigrateAgentsBatch', () => {
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  const soClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('counts the agents that fail validation in the action total', async () => {
    const agentlessAgent = makeAgent({
      id: 'agent-agentless',
      policy_id: 'agentless-policy',
      policy_base_id: 'agentless-policy',
    });
    const openAgent = makeAgent({
      id: 'agent-open',
      policy_id: 'open-policy',
      policy_base_id: 'open-policy',
    });

    await bulkMigrateAgentsBatch(esClient, soClient, [agentlessAgent, openAgent], {
      uri: 'https://example.com:8220',
      enrollment_token: 'token',
    });

    expect(createAgentAction).toHaveBeenCalledWith(
      esClient,
      soClient,
      expect.objectContaining({ agents: ['agent-open'], total: 2, type: 'MIGRATE' })
    );
    expect(createErrorActionResults).toHaveBeenCalledWith(
      esClient,
      expect.any(String),
      { 'agent-agentless': expect.any(Error) },
      expect.any(String)
    );
  });

  it('keeps total 1 and no error results when the only agent is eligible', async () => {
    const openAgent = makeAgent({
      id: 'agent-open',
      policy_id: 'open-policy',
      policy_base_id: 'open-policy',
    });

    await bulkMigrateAgentsBatch(esClient, soClient, [openAgent], {});

    expect(createAgentAction).toHaveBeenCalledWith(
      esClient,
      soClient,
      expect.objectContaining({ agents: ['agent-open'], total: 1 })
    );
    expect(createErrorActionResults).toHaveBeenCalledWith(
      esClient,
      expect.any(String),
      {},
      expect.any(String)
    );
  });

  it('uses the given total when it is passed', async () => {
    const openAgent = makeAgent({
      id: 'agent-open',
      policy_id: 'open-policy',
      policy_base_id: 'open-policy',
    });

    await bulkMigrateAgentsBatch(esClient, soClient, [openAgent], { total: 500 });

    expect(createAgentAction).toHaveBeenCalledWith(
      esClient,
      soClient,
      expect.objectContaining({ total: 500 })
    );
  });
});
