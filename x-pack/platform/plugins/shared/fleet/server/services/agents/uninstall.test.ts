/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import {
  AgentlessAgentRestrictionError,
  FleetError,
  HostedAgentPolicyRestrictionRelatedError,
} from '../../errors';
import { getCurrentNamespace } from '../spaces/get_current_namespace';
import { agentPolicyService } from '../agent_policy';
import {
  UNINSTALL_DELAY_DEFAULT_SECONDS,
  UNINSTALL_DELAY_MAX_SECONDS,
  UNINSTALL_DELAY_MIN_SECONDS,
} from '../../../common/services';

import { bulkUninstallAgents, getUninstallActionTiming, uninstallAgent } from './uninstall';
import { getAgentById, getAgentsById, getAgentsByKuery, openPointInTime } from './crud';
import { createAgentAction, createErrorActionResults } from './actions';
import { UninstallActionRunner, uninstallBatch } from './uninstall_action_runner';

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

jest.mock('./uninstall_action_runner', () => ({
  ...jest.requireActual('./uninstall_action_runner'),
  UninstallActionRunner: jest.fn(),
  uninstallBatch: jest.fn(),
}));

jest.mock('../spaces/get_current_namespace', () => ({
  getCurrentNamespace: jest.fn(),
}));

jest.mock('../agent_policy', () => ({
  agentPolicyService: {
    get: jest.fn(),
  },
}));

const mockGetAgentById = getAgentById as jest.MockedFunction<typeof getAgentById>;
const mockGetAgentsById = getAgentsById as jest.MockedFunction<typeof getAgentsById>;
const mockGetAgentsByKuery = getAgentsByKuery as jest.MockedFunction<typeof getAgentsByKuery>;
const mockOpenPointInTime = openPointInTime as jest.MockedFunction<typeof openPointInTime>;
const mockCreateAgentAction = createAgentAction as jest.MockedFunction<typeof createAgentAction>;
const mockCreateErrorActionResults = createErrorActionResults as jest.MockedFunction<
  typeof createErrorActionResults
>;
const mockUninstallBatch = uninstallBatch as jest.MockedFunction<typeof uninstallBatch>;
const mockUninstallActionRunner = UninstallActionRunner as jest.MockedClass<
  typeof UninstallActionRunner
>;
const mockGetCurrentNamespace = getCurrentNamespace as jest.MockedFunction<
  typeof getCurrentNamespace
>;
const mockAgentPolicyGet = agentPolicyService.get as jest.MockedFunction<
  typeof agentPolicyService.get
>;

const makeAgent = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'agent-1',
    policy_id: 'policy-1',
    active: true,
    uninstall_pending: true,
    local_metadata: { elastic: { agent: { uninstallable: true } } },
    ...overrides,
  } as any);

describe('uninstall', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let soClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    soClient = savedObjectsClientMock.create();
    mockGetCurrentNamespace.mockReturnValue('default');
  });

  describe('getUninstallActionTiming', () => {
    const now = Date.parse('2026-10-30T12:00:00.000Z');

    it('defaults to a 1 hour grace period and expires 24h after start_time', () => {
      expect(getUninstallActionTiming(undefined, now)).toEqual({
        startTime: '2026-10-30T13:00:00.000Z',
        expiration: '2026-10-31T13:00:00.000Z',
      });
    });

    it('accepts the minimum and maximum delay', () => {
      expect(getUninstallActionTiming(UNINSTALL_DELAY_MIN_SECONDS, now).startTime).toBe(
        '2026-10-30T13:00:00.000Z'
      );
      expect(getUninstallActionTiming(UNINSTALL_DELAY_MAX_SECONDS, now).startTime).toBe(
        '2026-10-31T12:00:00.000Z'
      );
    });

    it.each([0, UNINSTALL_DELAY_MIN_SECONDS - 1, UNINSTALL_DELAY_MAX_SECONDS + 1, 3600.5, -3600])(
      'rejects delay %p',
      (delay) => {
        expect(() => getUninstallActionTiming(delay, now)).toThrow(FleetError);
      }
    );
  });

  describe('uninstallAgent', () => {
    it('creates a scheduled UNINSTALL action with no data', async () => {
      mockGetAgentById.mockResolvedValue(makeAgent());
      mockAgentPolicyGet.mockResolvedValue({ id: 'policy-1', is_managed: false } as any);
      mockCreateAgentAction.mockResolvedValue({ id: 'action-123' } as any);
      const before = Date.now();

      const result = await uninstallAgent(esClient, soClient, 'agent-1');

      expect(result).toEqual({ actionId: 'action-123' });
      const action = mockCreateAgentAction.mock.calls[0][2];
      expect(action).toEqual({
        agents: ['agent-1'],
        created_at: expect.any(String),
        type: 'UNINSTALL',
        start_time: expect.any(String),
        expiration: expect.any(String),
        namespaces: ['default'],
      });
      const startMs = Date.parse(action.start_time!);
      expect(startMs).toBeGreaterThanOrEqual(before + UNINSTALL_DELAY_DEFAULT_SECONDS * 1000);
      expect(Date.parse(action.expiration!)).toBeGreaterThan(startMs);
    });

    it('honors a custom delay', async () => {
      mockGetAgentById.mockResolvedValue(makeAgent({ policy_id: undefined }));
      mockCreateAgentAction.mockResolvedValue({ id: 'action-1' } as any);
      const before = Date.now();

      await uninstallAgent(esClient, soClient, 'agent-1', { delaySeconds: 2 * 60 * 60 });

      const startMs = Date.parse(mockCreateAgentAction.mock.calls[0][2].start_time!);
      expect(startMs).toBeGreaterThanOrEqual(before + 2 * 60 * 60 * 1000);
    });

    it('rejects an invalid delay before reading the agent', async () => {
      await expect(
        uninstallAgent(esClient, soClient, 'agent-1', { delaySeconds: 0 })
      ).rejects.toThrow(FleetError);
      expect(mockGetAgentById).not.toHaveBeenCalled();
      expect(mockCreateAgentAction).not.toHaveBeenCalled();
    });

    it.each([
      [
        'has no uninstallable flag',
        { local_metadata: { elastic: { agent: {} } } },
        /does not support/,
      ],
      [
        'is unprivileged',
        { local_metadata: { elastic: { agent: { uninstallable: true, unprivileged: true } } } },
        /unprivileged/,
      ],
      ['is not unenrolled', { uninstall_pending: false }, /must be unenrolled/],
      ['is inactive', { active: false }, /does not support/],
    ])('throws FleetError when the agent %s', async (_, overrides, message) => {
      mockGetAgentById.mockResolvedValue(makeAgent(overrides));

      const promise = uninstallAgent(esClient, soClient, 'agent-1');
      await expect(promise).rejects.toThrow(FleetError);
      await expect(promise).rejects.toThrow(message);
      expect(mockCreateAgentAction).not.toHaveBeenCalled();
    });

    it('throws HostedAgentPolicyRestrictionRelatedError for a managed policy', async () => {
      mockGetAgentById.mockResolvedValue(makeAgent());
      mockAgentPolicyGet.mockResolvedValue({ id: 'policy-1', is_managed: true } as any);

      await expect(uninstallAgent(esClient, soClient, 'agent-1')).rejects.toThrow(
        HostedAgentPolicyRestrictionRelatedError
      );
      expect(mockCreateAgentAction).not.toHaveBeenCalled();
    });

    it('throws AgentlessAgentRestrictionError for an agentless policy', async () => {
      mockGetAgentById.mockResolvedValue(makeAgent());
      mockAgentPolicyGet.mockResolvedValue({
        id: 'policy-1',
        is_managed: false,
        supports_agentless: true,
      } as any);

      await expect(uninstallAgent(esClient, soClient, 'agent-1')).rejects.toThrow(
        AgentlessAgentRestrictionError
      );
      expect(mockCreateAgentAction).not.toHaveBeenCalled();
    });
  });

  describe('bulkUninstallAgents', () => {
    it('calls uninstallBatch with the computed timing when agentIds are provided', async () => {
      const agents = [{ id: 'agent-1' }, { id: 'agent-2' }] as any[];
      mockGetAgentsById.mockResolvedValue(agents);
      mockUninstallBatch.mockResolvedValue({ actionId: 'bulk-action-1' });
      mockCreateErrorActionResults.mockResolvedValue(undefined as any);

      const result = await bulkUninstallAgents(esClient, soClient, {
        agentIds: ['agent-1', 'agent-2', 'agent-2'],
        delaySeconds: 2 * 60 * 60,
      });

      expect(result).toEqual({ actionId: 'bulk-action-1' });
      expect(mockUninstallBatch).toHaveBeenCalledWith(esClient, soClient, agents, {
        startTime: expect.any(String),
        expiration: expect.any(String),
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

    it('rejects an invalid delay without touching any agent', async () => {
      await expect(
        bulkUninstallAgents(esClient, soClient, { agentIds: ['agent-1'], delaySeconds: 10 })
      ).rejects.toThrow(FleetError);
      expect(mockGetAgentsById).not.toHaveBeenCalled();
      expect(mockUninstallBatch).not.toHaveBeenCalled();
    });

    it('writes error results for missing agentIds', async () => {
      mockGetAgentsById.mockResolvedValue([
        { id: 'agent-1' },
        { id: 'missing-1', notFound: true },
      ] as any[]);
      mockUninstallBatch.mockResolvedValue({ actionId: 'bulk-action-missing' });
      mockCreateErrorActionResults.mockResolvedValue(undefined as any);

      await bulkUninstallAgents(esClient, soClient, { agentIds: ['agent-1', 'missing-1'] });

      expect(mockUninstallBatch).toHaveBeenCalledWith(
        esClient,
        soClient,
        [{ id: 'agent-1' }],
        expect.objectContaining({ total: 2 })
      );
      expect(mockCreateErrorActionResults).toHaveBeenCalledWith(
        esClient,
        'bulk-action-missing',
        { 'missing-1': expect.any(Error) },
        'agent not found'
      );
    });

    it('calls uninstallBatch for a kuery when total <= batchSize', async () => {
      const agents = [{ id: 'agent-1' }] as any[];
      mockGetAgentsByKuery
        .mockResolvedValueOnce({ total: 1, agents: [] } as any)
        .mockResolvedValueOnce({ total: 1, agents } as any);
      mockUninstallBatch.mockResolvedValue({ actionId: 'bulk-action-2' });

      const result = await bulkUninstallAgents(esClient, soClient, { kuery: 'status:online' });

      expect(result).toEqual({ actionId: 'bulk-action-2' });
      expect(mockUninstallBatch).toHaveBeenCalledWith(esClient, soClient, agents, {
        startTime: expect.any(String),
        expiration: expect.any(String),
        spaceId: 'default',
      });
    });

    it('uses UninstallActionRunner with a single timing for a kuery when total > batchSize', async () => {
      mockGetAgentsByKuery.mockResolvedValue({ total: 10001, agents: [] } as any);
      mockOpenPointInTime.mockResolvedValue('pit-id');
      const mockRunActionAsyncTask = jest.fn().mockResolvedValue({ actionId: 'runner-action-1' });
      mockUninstallActionRunner.mockImplementation(
        () => ({ runActionAsyncTask: mockRunActionAsyncTask } as any)
      );

      const result = await bulkUninstallAgents(esClient, soClient, { kuery: 'status:online' });

      expect(result).toEqual({ actionId: 'runner-action-1' });
      expect(mockUninstallActionRunner).toHaveBeenCalledWith(
        esClient,
        soClient,
        expect.objectContaining({
          kuery: 'status:online',
          startTime: expect.any(String),
          expiration: expect.any(String),
          total: 10001,
          spaceId: 'default',
        }),
        { pitId: 'pit-id' }
      );
      expect(mockRunActionAsyncTask).toHaveBeenCalled();
      expect(mockUninstallBatch).not.toHaveBeenCalled();
    });
  });
});
