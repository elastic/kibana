/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { appContextService } from '../app_context';

import { createAgentAction, createErrorActionResults } from './actions';
import { getAgentPolicyRestrictions, isAgentlessAgent, isHostedAgent } from './hosted_agent';
import { uninstallBatch } from './uninstall_action_runner';

jest.mock('./actions', () => ({
  createAgentAction: jest.fn(),
  createErrorActionResults: jest.fn(),
}));

jest.mock('./hosted_agent', () => ({
  getAgentPolicyRestrictions: jest.fn(),
  isHostedAgent: jest.fn(),
  isAgentlessAgent: jest.fn(),
}));

jest.mock('../app_context', () => ({
  appContextService: {
    getInternalUserSOClientForSpaceId: jest.fn(),
  },
}));

const mockCreateAgentAction = createAgentAction as jest.MockedFunction<typeof createAgentAction>;
const mockCreateErrorActionResults = createErrorActionResults as jest.MockedFunction<
  typeof createErrorActionResults
>;
const mockGetAgentPolicyRestrictions = getAgentPolicyRestrictions as jest.MockedFunction<
  typeof getAgentPolicyRestrictions
>;
const mockIsAgentlessAgent = isAgentlessAgent as jest.MockedFunction<typeof isAgentlessAgent>;
const mockIsHostedAgent = isHostedAgent as jest.MockedFunction<typeof isHostedAgent>;
const mockGetInternalSOClient =
  appContextService.getInternalUserSOClientForSpaceId as jest.MockedFunction<
    typeof appContextService.getInternalUserSOClientForSpaceId
  >;

const START_TIME = '2026-10-30T18:00:00.000Z';
const EXPIRATION = '2026-10-31T18:00:00.000Z';
const timing = { startTime: START_TIME, expiration: EXPIRATION, spaceId: 'default' };

const makeAgent = (
  id: string,
  overrides: { uninstallPending?: boolean; agentMetadata?: Record<string, unknown> } = {}
) =>
  ({
    id,
    policy_id: 'policy-1',
    active: true,
    uninstall_pending: overrides.uninstallPending ?? true,
    local_metadata: {
      elastic: { agent: overrides.agentMetadata ?? { uninstallable: true } },
    },
  } as any);

describe('uninstallBatch', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let internalSoClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    soClient = savedObjectsClientMock.create();
    internalSoClient = savedObjectsClientMock.create();
    mockGetInternalSOClient.mockReturnValue(internalSoClient);
    mockGetAgentPolicyRestrictions.mockResolvedValue({} as any);
    mockIsHostedAgent.mockReturnValue(false);
    mockIsAgentlessAgent.mockReturnValue(false);
    mockCreateAgentAction.mockResolvedValue({ id: 'action-1' } as any);
    mockCreateErrorActionResults.mockResolvedValue(undefined);
  });

  it('creates an UNINSTALL action with start_time and expiration for eligible agents', async () => {
    const result = await uninstallBatch(
      esClient,
      soClient,
      [makeAgent('a1'), makeAgent('a2')],
      timing
    );

    expect(result).toEqual({ actionId: expect.any(String) });
    expect(mockCreateAgentAction).toHaveBeenCalledWith(
      esClient,
      internalSoClient,
      expect.objectContaining({
        agents: ['a1', 'a2'],
        type: 'UNINSTALL',
        start_time: START_TIME,
        expiration: EXPIRATION,
        namespaces: ['default'],
      })
    );
    expect(mockCreateAgentAction.mock.calls[0][2]).not.toHaveProperty('data');
    expect(mockCreateErrorActionResults).toHaveBeenCalledWith(
      esClient,
      expect.any(String),
      {},
      expect.any(String)
    );
  });

  it('excludes agents without the uninstallable flag', async () => {
    await uninstallBatch(
      esClient,
      soClient,
      [makeAgent('old', { agentMetadata: {} }), makeAgent('new')],
      timing
    );

    expect(mockCreateAgentAction).toHaveBeenCalledWith(
      esClient,
      internalSoClient,
      expect.objectContaining({ agents: ['new'] })
    );
    const errorsArg = (mockCreateErrorActionResults as jest.Mock).mock.calls[0][2];
    expect(Object.keys(errorsArg)).toEqual(['old']);
    expect(errorsArg.old.message).toMatch(/does not support the uninstall action/i);
  });

  it('excludes unprivileged agents', async () => {
    await uninstallBatch(
      esClient,
      soClient,
      [makeAgent('unpriv', { agentMetadata: { uninstallable: true, unprivileged: true } })],
      timing
    );

    const errorsArg = (mockCreateErrorActionResults as jest.Mock).mock.calls[0][2];
    expect(errorsArg.unpriv.message).toMatch(/unprivileged/i);
    expect(mockCreateAgentAction).toHaveBeenCalledWith(
      esClient,
      internalSoClient,
      expect.objectContaining({ agents: [] })
    );
  });

  it('excludes agents that have not been unenrolled first', async () => {
    await uninstallBatch(
      esClient,
      soClient,
      [makeAgent('enrolled', { uninstallPending: false }), makeAgent('pending')],
      timing
    );

    expect(mockCreateAgentAction).toHaveBeenCalledWith(
      esClient,
      internalSoClient,
      expect.objectContaining({ agents: ['pending'] })
    );
    const errorsArg = (mockCreateErrorActionResults as jest.Mock).mock.calls[0][2];
    expect(Object.keys(errorsArg)).toEqual(['enrolled']);
    expect(errorsArg.enrolled.message).toMatch(/must be unenrolled/i);
  });

  it('excludes hosted agents', async () => {
    mockIsHostedAgent.mockImplementation((_, agent) => agent.id === 'hosted-1');

    await uninstallBatch(esClient, soClient, [makeAgent('hosted-1'), makeAgent('ok')], timing);

    expect(mockCreateAgentAction).toHaveBeenCalledWith(
      esClient,
      internalSoClient,
      expect.objectContaining({ agents: ['ok'] })
    );
    const errorsArg = (mockCreateErrorActionResults as jest.Mock).mock.calls[0][2];
    expect(errorsArg['hosted-1'].message).toMatch(/hosted agent policy/i);
  });

  it('excludes agentless agents', async () => {
    mockIsAgentlessAgent.mockImplementation((_, agent) => agent.id === 'agentless-1');

    await uninstallBatch(esClient, soClient, [makeAgent('agentless-1'), makeAgent('ok')], timing);

    const errorsArg = (mockCreateErrorActionResults as jest.Mock).mock.calls[0][2];
    expect(Object.keys(errorsArg)).toEqual(['agentless-1']);
    expect(errorsArg['agentless-1'].message).toMatch(/managed agent/i);
  });

  it('creates the action before writing error results', async () => {
    const callOrder: string[] = [];
    mockCreateAgentAction.mockImplementation(async () => {
      callOrder.push('createAgentAction');
      return { id: 'action-1' } as any;
    });
    mockCreateErrorActionResults.mockImplementation(async () => {
      callOrder.push('createErrorActionResults');
    });

    await uninstallBatch(esClient, soClient, [makeAgent('x', { uninstallPending: false })], timing);

    expect(callOrder).toEqual(['createAgentAction', 'createErrorActionResults']);
  });

  it('uses actionId and total from options when provided', async () => {
    const result = await uninstallBatch(esClient, soClient, [makeAgent('a1')], {
      ...timing,
      actionId: 'preset-action-id',
      total: 42,
    });

    expect(result).toEqual({ actionId: 'preset-action-id' });
    expect(mockCreateAgentAction).toHaveBeenCalledWith(
      esClient,
      internalSoClient,
      expect.objectContaining({ id: 'preset-action-id', total: 42 })
    );
  });
});
