/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { appContextService } from '../app_context';
import * as commonServices from '../../../common/services';

import { createAgentAction, createErrorActionResults } from './actions';
import { getHostedPolicies, isHostedAgent } from './hosted_agent';
import { restartBatch } from './restart_action_runner';

jest.mock('./actions', () => ({
  createAgentAction: jest.fn(),
  createErrorActionResults: jest.fn(),
}));

jest.mock('./hosted_agent', () => ({
  getHostedPolicies: jest.fn(),
  isHostedAgent: jest.fn(),
}));

jest.mock('../app_context', () => ({
  appContextService: {
    getInternalUserSOClientForSpaceId: jest.fn(),
  },
}));

jest.mock('../../../common/services', () => ({
  ...jest.requireActual('../../../common/services'),
  isAgentRestartSupported: jest.fn(),
}));

const mockCreateAgentAction = createAgentAction as jest.MockedFunction<typeof createAgentAction>;
const mockCreateErrorActionResults = createErrorActionResults as jest.MockedFunction<
  typeof createErrorActionResults
>;
const mockGetHostedPolicies = getHostedPolicies as jest.MockedFunction<typeof getHostedPolicies>;
const mockIsHostedAgent = isHostedAgent as jest.MockedFunction<typeof isHostedAgent>;
const mockIsAgentRestartSupported = commonServices.isAgentRestartSupported as jest.MockedFunction<
  typeof commonServices.isAgentRestartSupported
>;
const mockGetInternalSOClient =
  appContextService.getInternalUserSOClientForSpaceId as jest.MockedFunction<
    typeof appContextService.getInternalUserSOClientForSpaceId
  >;

function makeAgent(id: string, policyId = 'policy-1') {
  return { id, policy_id: policyId, active: true } as any;
}

describe('restartBatch', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let internalSoClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    soClient = savedObjectsClientMock.create();
    internalSoClient = savedObjectsClientMock.create();
    mockGetInternalSOClient.mockReturnValue(internalSoClient);
    mockGetHostedPolicies.mockResolvedValue({} as any);
    mockIsHostedAgent.mockReturnValue(false);
    mockIsAgentRestartSupported.mockReturnValue(true);
    mockCreateAgentAction.mockResolvedValue({ id: 'action-1' } as any);
    mockCreateErrorActionResults.mockResolvedValue(undefined);
  });

  it('creates action for all agents when none are hosted', async () => {
    const agents = [makeAgent('a1'), makeAgent('a2')];

    const result = await restartBatch(esClient, soClient, agents, { spaceId: 'default' });

    expect(result).toEqual({ actionId: expect.any(String) });
    expect(mockCreateAgentAction).toHaveBeenCalledWith(
      esClient,
      internalSoClient,
      expect.objectContaining({
        agents: ['a1', 'a2'],
        type: 'RESTART',
        namespaces: ['default'],
      })
    );
    expect(mockCreateErrorActionResults).toHaveBeenCalledWith(
      esClient,
      expect.any(String),
      {},
      expect.any(String)
    );
  });

  it('excludes hosted agents from the action and writes error results for them', async () => {
    const hostedAgent = makeAgent('hosted-1', 'managed-policy');
    const eligibleAgent = makeAgent('eligible-1', 'normal-policy');
    const agents = [hostedAgent, eligibleAgent];
    const hostedPolicies = { 'managed-policy': true } as any;

    mockGetHostedPolicies.mockResolvedValue(hostedPolicies);
    mockIsHostedAgent.mockImplementation((policies, agent) => agent.id === 'hosted-1');

    const result = await restartBatch(esClient, soClient, agents, { spaceId: 'default' });

    expect(result).toEqual({ actionId: expect.any(String) });

    expect(mockCreateAgentAction).toHaveBeenCalledWith(
      esClient,
      internalSoClient,
      expect.objectContaining({ agents: ['eligible-1'] })
    );

    const errorsArg = (mockCreateErrorActionResults as jest.Mock).mock.calls[0][2];
    expect(Object.keys(errorsArg)).toEqual(['hosted-1']);
    expect(errorsArg['hosted-1'].message).toMatch(/hosted agent policy/i);
  });

  it('creates empty action when all agents are hosted', async () => {
    const agents = [makeAgent('h1'), makeAgent('h2')];
    mockIsHostedAgent.mockReturnValue(true);

    await restartBatch(esClient, soClient, agents, { spaceId: 'default' });

    expect(mockCreateAgentAction).toHaveBeenCalledWith(
      esClient,
      internalSoClient,
      expect.objectContaining({ agents: [] })
    );

    const errorsArg = (mockCreateErrorActionResults as jest.Mock).mock.calls[0][2];
    expect(Object.keys(errorsArg)).toHaveLength(2);
  });

  it('creates action BEFORE writing error results', async () => {
    const callOrder: string[] = [];
    mockCreateAgentAction.mockImplementation(async () => {
      callOrder.push('createAgentAction');
      return { id: 'action-1' } as any;
    });
    mockCreateErrorActionResults.mockImplementation(async () => {
      callOrder.push('createErrorActionResults');
    });

    mockIsHostedAgent.mockReturnValue(true);
    await restartBatch(esClient, soClient, [makeAgent('h1')], { spaceId: 'default' });

    expect(callOrder).toEqual(['createAgentAction', 'createErrorActionResults']);
  });

  it('uses actionId from options when provided', async () => {
    const agents = [makeAgent('a1')];

    const result = await restartBatch(esClient, soClient, agents, {
      spaceId: 'default',
      actionId: 'preset-action-id',
    });

    expect(result).toEqual({ actionId: 'preset-action-id' });
    expect(mockCreateAgentAction).toHaveBeenCalledWith(
      esClient,
      internalSoClient,
      expect.objectContaining({ id: 'preset-action-id' })
    );
  });

  it('uses total from options when provided', async () => {
    const agents = [makeAgent('a1')];

    await restartBatch(esClient, soClient, agents, { spaceId: 'default', total: 42 });

    expect(mockCreateAgentAction).toHaveBeenCalledWith(
      esClient,
      internalSoClient,
      expect.objectContaining({ total: 42 })
    );
  });

  describe('version filtering', () => {
    it('excludes agents below minimum version and writes error results', async () => {
      const unsupported = makeAgent('old-agent');
      const supported = makeAgent('new-agent');
      mockIsAgentRestartSupported.mockImplementation(
        (agent: { id: string }) => agent.id === 'new-agent'
      );

      await restartBatch(esClient, soClient, [unsupported, supported], { spaceId: 'default' });

      expect(mockCreateAgentAction).toHaveBeenCalledWith(
        esClient,
        internalSoClient,
        expect.objectContaining({ agents: ['new-agent'] })
      );
      const errorsArg = (mockCreateErrorActionResults as jest.Mock).mock.calls[0][2];
      expect(Object.keys(errorsArg)).toEqual(['old-agent']);
      expect(errorsArg['old-agent'].message).toMatch(/does not support the restart action/i);
    });

    it('creates empty action when all agents are below minimum version', async () => {
      const agents = [makeAgent('old-1'), makeAgent('old-2')];
      mockIsAgentRestartSupported.mockReturnValue(false);

      await restartBatch(esClient, soClient, agents, { spaceId: 'default' });

      expect(mockCreateAgentAction).toHaveBeenCalledWith(
        esClient,
        internalSoClient,
        expect.objectContaining({ agents: [] })
      );
      const errorsArg = (mockCreateErrorActionResults as jest.Mock).mock.calls[0][2];
      expect(Object.keys(errorsArg)).toHaveLength(2);
    });

    it('prioritises hosted-policy error over version error when both apply', async () => {
      const agent = makeAgent('h1');
      mockIsHostedAgent.mockReturnValue(true);
      mockIsAgentRestartSupported.mockReturnValue(false);

      await restartBatch(esClient, soClient, [agent], { spaceId: 'default' });

      const errorsArg = (mockCreateErrorActionResults as jest.Mock).mock.calls[0][2];
      expect(errorsArg['h1'].message).toMatch(/hosted agent policy/i);
    });
  });
});
