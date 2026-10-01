/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { FleetError, HostedAgentPolicyRestrictionRelatedError } from '../../errors';
import { getCurrentNamespace } from '../spaces/get_current_namespace';

import { restartAgent, bulkRestartAgents } from './restart';
import { getAgentById, getAgentsById, getAgentsByKuery, openPointInTime } from './crud';
import { createAgentAction, createErrorActionResults } from './actions';
import { RestartActionRunner, restartBatch } from './restart_action_runner';

jest.mock('./crud', () => ({
  getAgentById: jest.fn(),
  getAgentsById: jest.fn(),
  getAgentsByKuery: jest.fn(),
  openPointInTime: jest.fn(),
}));

jest.mock('./actions', () => ({
  createAgentAction: jest.fn(),
  createErrorActionResults: jest.fn(),
}));

jest.mock('./restart_action_runner', () => ({
  RestartActionRunner: jest.fn(),
  restartBatch: jest.fn(),
}));

jest.mock('../spaces/get_current_namespace', () => ({
  getCurrentNamespace: jest.fn(),
}));

jest.mock('../agent_policy', () => ({
  agentPolicyService: {
    get: jest.fn(),
  },
}));

jest.mock('../../../common/services', () => ({
  ...jest.requireActual('../../../common/services'),
  isAgentRestartSupported: jest.fn(),
}));

import { agentPolicyService } from '../agent_policy';
import * as commonServices from '../../../common/services';

const mockGetAgentById = getAgentById as jest.MockedFunction<typeof getAgentById>;
const mockGetAgentsById = getAgentsById as jest.MockedFunction<typeof getAgentsById>;
const mockGetAgentsByKuery = getAgentsByKuery as jest.MockedFunction<typeof getAgentsByKuery>;
const mockOpenPointInTime = openPointInTime as jest.MockedFunction<typeof openPointInTime>;
const mockCreateAgentAction = createAgentAction as jest.MockedFunction<typeof createAgentAction>;
const mockCreateErrorActionResults = createErrorActionResults as jest.MockedFunction<
  typeof createErrorActionResults
>;
const mockRestartBatch = restartBatch as jest.MockedFunction<typeof restartBatch>;
const mockRestartActionRunner = RestartActionRunner as jest.MockedClass<typeof RestartActionRunner>;
const mockGetCurrentNamespace = getCurrentNamespace as jest.MockedFunction<
  typeof getCurrentNamespace
>;

describe('restart', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let soClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    soClient = savedObjectsClientMock.create();
    mockGetCurrentNamespace.mockReturnValue('default');
  });

  const mockIsAgentRestartSupported = commonServices.isAgentRestartSupported as jest.MockedFunction<
    typeof commonServices.isAgentRestartSupported
  >;
  const mockAgentPolicyGet = agentPolicyService.get as jest.MockedFunction<
    typeof agentPolicyService.get
  >;

  describe('restartAgent', () => {
    beforeEach(() => {
      mockIsAgentRestartSupported.mockReturnValue(true);
    });

    it('should create RESTART action for a non-managed agent', async () => {
      mockGetAgentById.mockResolvedValue({ id: 'agent-1', policy_id: 'policy-1' } as any);
      mockAgentPolicyGet.mockResolvedValue({ id: 'policy-1', is_managed: false } as any);
      mockCreateAgentAction.mockResolvedValue({ id: 'action-123' } as any);

      const result = await restartAgent(esClient, soClient, 'agent-1');

      expect(result).toEqual({ actionId: 'action-123' });
      expect(mockCreateAgentAction).toHaveBeenCalledWith(esClient, soClient, {
        agents: ['agent-1'],
        created_at: expect.any(String),
        type: 'RESTART',
        namespaces: ['default'],
      });
    });

    it('should throw FleetError for agent below minimum version', async () => {
      mockGetAgentById.mockResolvedValue({ id: 'agent-1', policy_id: 'policy-1' } as any);
      mockIsAgentRestartSupported.mockReturnValue(false);

      await expect(restartAgent(esClient, soClient, 'agent-1')).rejects.toThrow(FleetError);
      expect(mockCreateAgentAction).not.toHaveBeenCalled();
    });

    it('should throw HostedAgentPolicyRestrictionRelatedError for managed agent', async () => {
      mockGetAgentById.mockResolvedValue({ id: 'agent-1', policy_id: 'hosted-policy' } as any);
      mockAgentPolicyGet.mockResolvedValue({ id: 'hosted-policy', is_managed: true } as any);

      await expect(restartAgent(esClient, soClient, 'agent-1')).rejects.toThrow(
        HostedAgentPolicyRestrictionRelatedError
      );
      expect(mockCreateAgentAction).not.toHaveBeenCalled();
    });

    it('should proceed when agent has no policy', async () => {
      mockGetAgentById.mockResolvedValue({ id: 'agent-1', policy_id: undefined } as any);
      mockCreateAgentAction.mockResolvedValue({ id: 'action-456' } as any);

      const result = await restartAgent(esClient, soClient, 'agent-1');

      expect(result).toEqual({ actionId: 'action-456' });
      expect(mockCreateAgentAction).toHaveBeenCalled();
    });
  });

  describe('bulkRestartAgents', () => {
    it('should call restartBatch when agentIds provided', async () => {
      const agents = [{ id: 'agent-1' }, { id: 'agent-2' }] as any[];
      mockGetAgentsById.mockResolvedValue(agents);
      mockRestartBatch.mockResolvedValue({ actionId: 'bulk-action-1' });
      mockCreateErrorActionResults.mockResolvedValue(undefined as any);

      const result = await bulkRestartAgents(esClient, soClient, {
        agentIds: ['agent-1', 'agent-2'],
      });

      expect(result).toEqual({ actionId: 'bulk-action-1' });
      expect(mockRestartBatch).toHaveBeenCalledWith(esClient, soClient, agents, {
        spaceId: 'default',
        total: 2,
      });
      expect(mockCreateErrorActionResults).toHaveBeenCalledWith(
        esClient,
        'bulk-action-1',
        {},
        'agent not found'
      );
    });

    it('should write error results for missing agentIds', async () => {
      mockGetAgentsById.mockResolvedValue([
        { id: 'agent-1' },
        { id: 'missing-1', notFound: true },
      ] as any[]);
      mockRestartBatch.mockResolvedValue({ actionId: 'bulk-action-missing' });
      mockCreateErrorActionResults.mockResolvedValue(undefined as any);

      await bulkRestartAgents(esClient, soClient, { agentIds: ['agent-1', 'missing-1'] });

      expect(mockRestartBatch).toHaveBeenCalledWith(esClient, soClient, [{ id: 'agent-1' }], {
        spaceId: 'default',
        total: 2,
      });
      expect(mockCreateErrorActionResults).toHaveBeenCalledWith(
        esClient,
        'bulk-action-missing',
        { 'missing-1': expect.any(Error) },
        'agent not found'
      );
    });

    it('should call restartBatch for kuery when total <= batchSize', async () => {
      const agents = [{ id: 'agent-1' }] as any[];
      mockGetAgentsByKuery
        .mockResolvedValueOnce({ total: 1, agents: [] } as any)
        .mockResolvedValueOnce({ total: 1, agents } as any);
      mockRestartBatch.mockResolvedValue({ actionId: 'bulk-action-2' });

      const result = await bulkRestartAgents(esClient, soClient, { kuery: 'status:online' });

      expect(result).toEqual({ actionId: 'bulk-action-2' });
      expect(mockRestartBatch).toHaveBeenCalledWith(esClient, soClient, agents, {
        spaceId: 'default',
      });
    });

    it('should use RestartActionRunner for kuery when total > batchSize', async () => {
      mockGetAgentsByKuery.mockResolvedValue({ total: 10001, agents: [] } as any);
      mockOpenPointInTime.mockResolvedValue('pit-id');
      const mockRunActionAsyncTask = jest.fn().mockResolvedValue({ actionId: 'runner-action-1' });
      mockRestartActionRunner.mockImplementation(
        () =>
          ({
            runActionAsyncTask: mockRunActionAsyncTask,
          } as any)
      );

      const result = await bulkRestartAgents(esClient, soClient, { kuery: 'status:online' });

      expect(result).toEqual({ actionId: 'runner-action-1' });
      expect(mockRestartActionRunner).toHaveBeenCalled();
      expect(mockRunActionAsyncTask).toHaveBeenCalled();
      expect(mockRestartBatch).not.toHaveBeenCalled();
    });
  });
});
