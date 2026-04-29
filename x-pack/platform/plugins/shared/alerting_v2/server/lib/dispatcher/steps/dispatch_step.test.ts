/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowDetailDto } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import {
  createDispatcherPipelineState,
  createActionGroup,
  createActionPolicy,
} from '../fixtures/test_utils';
import { DispatchStep } from './dispatch_step';

const createMockWorkflowsManagement = (): jest.Mocked<WorkflowsServerPluginSetup['management']> =>
  ({
    getWorkflow: jest.fn(),
    scheduleWorkflow: jest.fn(),
  } as unknown as jest.Mocked<WorkflowsServerPluginSetup['management']>);

const createWorkflowDetailDto = (
  overrides: Partial<WorkflowDetailDto> = {}
): WorkflowDetailDto => ({
  id: 'workflow-1',
  name: 'Test Workflow',
  description: 'A test workflow',
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'elastic',
  lastUpdatedAt: '2026-01-01T00:00:00.000Z',
  lastUpdatedBy: 'elastic',
  definition: null,
  yaml: 'name: Test Workflow',
  valid: true,
  ...overrides,
});

describe('DispatchStep', () => {
  let mockWfm: jest.Mocked<WorkflowsServerPluginSetup['management']>;

  beforeEach(() => {
    mockWfm = createMockWorkflowsManagement();
  });

  afterEach(() => jest.clearAllMocks());

  it('dispatches each group to its workflow destinations', async () => {
    const { loggerService } = createLoggerService();
    const step = new DispatchStep(loggerService, mockWfm);

    mockWfm.getWorkflow.mockResolvedValue(createWorkflowDetailDto());
    mockWfm.scheduleWorkflow.mockResolvedValue('exec-1');

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
    const policy = createActionPolicy({
      id: 'p1',
      apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==',
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(mockWfm.getWorkflow).toHaveBeenCalledWith('workflow-1', 'default');
    expect(mockWfm.scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'workflow-1', name: 'Test Workflow' }),
      'default',
      expect.objectContaining({
        id: 'g1',
        policyId: 'p1',
        groupKey: group.groupKey,
        episodes: group.episodes,
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'ApiKey dGVzdC1pZDp0ZXN0LWtleQ==',
        }),
      }),
      'action_policy'
    );
  });

  it('skips dispatch when policy has no API key', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const step = new DispatchStep(loggerService, mockWfm);

    const group = createActionGroup({ id: 'g1', policyId: 'p1' });
    const policy = createActionPolicy({ id: 'p1' });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockWfm.getWorkflow).not.toHaveBeenCalled();
    expect(mockWfm.scheduleWorkflow).not.toHaveBeenCalled();
  });

  it('skips dispatch when workflow is not found', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const step = new DispatchStep(loggerService, mockWfm);

    mockWfm.getWorkflow.mockResolvedValue(null);

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'missing-workflow' }],
    });
    const policy = createActionPolicy({
      id: 'p1',
      apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==',
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockWfm.scheduleWorkflow).not.toHaveBeenCalled();
  });

  it('dispatches to multiple workflow destinations', async () => {
    const { loggerService } = createLoggerService();
    const step = new DispatchStep(loggerService, mockWfm);

    mockWfm.getWorkflow.mockResolvedValue(createWorkflowDetailDto());
    mockWfm.scheduleWorkflow.mockResolvedValue('exec-1');

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [
        { type: 'workflow', id: 'workflow-1' },
        { type: 'workflow', id: 'workflow-2' },
      ],
    });
    const policy = createActionPolicy({
      id: 'p1',
      apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==',
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
    });

    await step.execute(state);

    expect(mockWfm.getWorkflow).toHaveBeenCalledTimes(2);
    expect(mockWfm.scheduleWorkflow).toHaveBeenCalledTimes(2);
  });

  it('continues with no-op when dispatch is empty', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const step = new DispatchStep(loggerService, mockWfm);

    const state = createDispatcherPipelineState({ dispatch: [] });
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(mockLogger.debug).not.toHaveBeenCalled();
  });

  it('continues when dispatch is undefined', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const step = new DispatchStep(loggerService, mockWfm);

    const state = createDispatcherPipelineState({});
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(mockLogger.debug).not.toHaveBeenCalled();
  });

  it('continues dispatching remaining groups when one group fails', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const step = new DispatchStep(loggerService, mockWfm);

    mockWfm.getWorkflow.mockResolvedValue(createWorkflowDetailDto());
    mockWfm.scheduleWorkflow
      .mockResolvedValueOnce('exec-1')
      .mockRejectedValueOnce(new Error('network timeout'))
      .mockResolvedValueOnce('exec-3');

    const policy = createActionPolicy({
      id: 'p1',
      apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==',
    });

    const groups = Array.from({ length: 3 }, (_, i) =>
      createActionGroup({
        id: `g${i}`,
        policyId: 'p1',
        destinations: [{ type: 'workflow', id: 'workflow-1' }],
      })
    );

    const state = createDispatcherPipelineState({
      dispatch: groups,
      policies: new Map([['p1', policy]]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(mockWfm.getWorkflow).toHaveBeenCalledTimes(3);
    expect(mockWfm.scheduleWorkflow).toHaveBeenCalledTimes(3);
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith('network timeout', expect.anything());
  });

  it('logs error when scheduleWorkflow throws', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const step = new DispatchStep(loggerService, mockWfm);

    mockWfm.getWorkflow.mockResolvedValue(createWorkflowDetailDto());
    mockWfm.scheduleWorkflow.mockRejectedValue(new Error('service unavailable'));

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
    const policy = createActionPolicy({
      id: 'p1',
      apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==',
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'service unavailable',
      expect.objectContaining({
        error: expect.objectContaining({ message: 'service unavailable' }),
      })
    );
  });

  it('continues dispatching remaining destinations when one destination fails', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const step = new DispatchStep(loggerService, mockWfm);

    mockWfm.getWorkflow.mockResolvedValue(createWorkflowDetailDto());
    mockWfm.scheduleWorkflow
      .mockRejectedValueOnce(new Error('workflow-1 failed'))
      .mockResolvedValueOnce('exec-2');

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [
        { type: 'workflow', id: 'workflow-1' },
        { type: 'workflow', id: 'workflow-2' },
      ],
    });
    const policy = createActionPolicy({
      id: 'p1',
      apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==',
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(mockWfm.scheduleWorkflow).toHaveBeenCalledTimes(2);
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
  });

  it('dispatches multiple groups concurrently with a max concurrency of 3', async () => {
    jest.useFakeTimers();
    const { loggerService } = createLoggerService();
    const step = new DispatchStep(loggerService, mockWfm);

    let inFlight = 0;
    let maxInFlight = 0;

    mockWfm.getWorkflow.mockResolvedValue(createWorkflowDetailDto());
    mockWfm.scheduleWorkflow.mockImplementation(
      () =>
        new Promise((resolve) => {
          inFlight++;
          maxInFlight = Math.max(maxInFlight, inFlight);
          setTimeout(() => {
            inFlight--;
            resolve('exec-id');
          }, 10);
        })
    );

    const policy = createActionPolicy({
      id: 'p1',
      apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==',
    });

    const groups = Array.from({ length: 5 }, (_, i) =>
      createActionGroup({
        id: `g${i}`,
        policyId: 'p1',
        destinations: [{ type: 'workflow', id: 'workflow-1' }],
      })
    );

    const state = createDispatcherPipelineState({
      dispatch: groups,
      policies: new Map([['p1', policy]]),
    });

    const executePromise = step.execute(state);

    await jest.advanceTimersByTimeAsync(100);

    const result = await executePromise;

    expect(result.type).toBe('continue');
    expect(mockWfm.scheduleWorkflow).toHaveBeenCalledTimes(5);
    expect(maxInFlight).toBeLessThanOrEqual(3);

    jest.useRealTimers();
  });
});
