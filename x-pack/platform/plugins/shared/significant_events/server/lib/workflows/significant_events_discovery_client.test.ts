/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { SignificantEventsWorkflowStatus } from '@kbn/significant-events-schema';
import { ExecutionStatus } from '@kbn/workflows';
import { SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID } from '@kbn/workflows/managed';
import { installDiscoveryAgents } from '../../agent_builder/agents/discovery';
import { SignificantEventsDiscoveryClient } from './significant_events_discovery_client';

jest.mock('../../agent_builder/agents/discovery', () => ({
  installDiscoveryAgents: jest.fn().mockResolvedValue(undefined),
}));

const installDiscoveryAgentsMock = installDiscoveryAgents as jest.MockedFunction<
  typeof installDiscoveryAgents
>;

const createMockManagementApi = (overrides: Record<string, jest.Mock> = {}) => ({
  getWorkflow: jest.fn().mockResolvedValue({
    id: SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID,
    name: 'sigevents-orchestrator',
    enabled: true,
    definition: {},
    yaml: '',
  }),
  runWorkflow: jest.fn().mockResolvedValue('execution-id'),
  getWorkflowExecutions: jest.fn().mockResolvedValue({ results: [], total: 0 }),
  getWorkflowExecution: jest.fn().mockResolvedValue(null),
  cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const createClient = (overrides: Record<string, jest.Mock> = {}) => {
  const managementApi = createMockManagementApi(overrides);
  const client = new SignificantEventsDiscoveryClient({ managementApi: managementApi as never });
  return { client, managementApi };
};

const createAgentBuilder = () => ({ agents: { ensure: jest.fn() } } as never);

describe('SignificantEventsDiscoveryClient', () => {
  beforeEach(() => {
    installDiscoveryAgentsMock.mockClear();
  });

  describe('run', () => {
    it('starts a new execution when none exist', async () => {
      const { client, managementApi } = createClient();
      const request = httpServerMock.createKibanaRequest();
      const agentBuilder = createAgentBuilder();

      const result = await client.run({
        request,
        spaceId: 'space-a',
        agentBuilder,
      });

      expect(result).toEqual({ executionId: 'execution-id', isNew: true });
      expect(installDiscoveryAgentsMock).toHaveBeenCalledWith({
        agentBuilder,
        spaceId: 'space-a',
      });
      expect(installDiscoveryAgentsMock.mock.invocationCallOrder[0]).toBeLessThan(
        managementApi.runWorkflow.mock.invocationCallOrder[0]
      );
      expect(managementApi.runWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ id: SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID }),
        'space-a',
        {},
        request
      );
    });

    it('starts a new execution when the latest is terminal', async () => {
      const { client, managementApi } = createClient({
        getWorkflowExecutions: jest
          .fn()
          .mockResolvedValue({ results: [{ id: 'old', status: ExecutionStatus.COMPLETED }] }),
      });
      const agentBuilder = createAgentBuilder();

      const result = await client.run({
        request: httpServerMock.createKibanaRequest(),
        spaceId: 'space-a',
        agentBuilder,
      });

      expect(result).toEqual({ executionId: 'execution-id', isNew: true });
      expect(installDiscoveryAgentsMock).toHaveBeenCalledWith({
        agentBuilder,
        spaceId: 'space-a',
      });
      expect(managementApi.runWorkflow).toHaveBeenCalled();
    });

    it('reuses the in-flight execution instead of starting a parallel run', async () => {
      const { client, managementApi } = createClient({
        getWorkflowExecutions: jest
          .fn()
          .mockResolvedValue({ results: [{ id: 'in-flight', status: ExecutionStatus.RUNNING }] }),
      });

      const result = await client.run({
        request: httpServerMock.createKibanaRequest(),
        spaceId: 'space-a',
        agentBuilder: createAgentBuilder(),
      });

      expect(result).toEqual({ executionId: 'in-flight', isNew: false });
      expect(installDiscoveryAgentsMock).not.toHaveBeenCalled();
      expect(managementApi.runWorkflow).not.toHaveBeenCalled();
    });

    it('throws when agentBuilder is omitted instead of starting without agents', async () => {
      const { client, managementApi } = createClient();

      await expect(
        client.run({
          request: httpServerMock.createKibanaRequest(),
          spaceId: 'space-a',
        })
      ).rejects.toThrow('Agent Builder is required to run significant events discovery');

      expect(installDiscoveryAgentsMock).not.toHaveBeenCalled();
      expect(managementApi.runWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('returns NotStarted with a null executionId when no executions exist', async () => {
      const { client } = createClient();

      const result = await client.getStatus({ spaceId: 'space-a' });

      expect(result).toEqual({
        status: SignificantEventsWorkflowStatus.NotStarted,
        executionId: null,
      });
    });

    it('maps a running execution to InProgress', async () => {
      const { client } = createClient({
        getWorkflowExecutions: jest
          .fn()
          .mockResolvedValue({ results: [{ id: 'exec-1', status: ExecutionStatus.RUNNING }] }),
      });

      const result = await client.getStatus({ spaceId: 'space-a' });

      expect(result).toEqual({
        status: SignificantEventsWorkflowStatus.InProgress,
        executionId: 'exec-1',
      });
    });

    it('surfaces the error message for a failed execution', async () => {
      const { client } = createClient({
        getWorkflowExecutions: jest.fn().mockResolvedValue({
          results: [{ id: 'exec-1', status: ExecutionStatus.FAILED, error: { message: 'boom' } }],
        }),
      });

      const result = await client.getStatus({ spaceId: 'space-a' });

      expect(result).toEqual({
        status: SignificantEventsWorkflowStatus.Failed,
        executionId: 'exec-1',
        error: 'boom',
      });
    });

    it('uses the timeout message for a timed-out execution', async () => {
      const { client } = createClient({
        getWorkflowExecutions: jest
          .fn()
          .mockResolvedValue({ results: [{ id: 'exec-1', status: ExecutionStatus.TIMED_OUT }] }),
      });

      const result = await client.getStatus({ spaceId: 'space-a' });

      expect(result).toEqual({
        status: SignificantEventsWorkflowStatus.Failed,
        executionId: 'exec-1',
        error: 'Workflow system-significant-events-orchestrator timed out',
      });
    });
  });

  describe('cancel', () => {
    it('cancels the latest non-terminal execution and returns its id', async () => {
      const { client, managementApi } = createClient({
        getWorkflowExecutions: jest
          .fn()
          .mockResolvedValue({ results: [{ id: 'exec-1', status: ExecutionStatus.RUNNING }] }),
      });
      const request = httpServerMock.createKibanaRequest();

      const result = await client.cancel({ request, spaceId: 'space-a' });

      expect(result).toBe('exec-1');
      expect(managementApi.cancelWorkflowExecution).toHaveBeenCalledWith(
        'exec-1',
        'space-a',
        request
      );
    });

    it('returns null when there is no active execution', async () => {
      const { client } = createClient();

      const result = await client.cancel({
        request: httpServerMock.createKibanaRequest(),
        spaceId: 'space-a',
      });

      expect(result).toBeNull();
    });
  });
});
