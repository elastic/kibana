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
  createAlertEpisode,
  createDispatcherPipelineState,
  createNotificationGroup,
  createNotificationPolicy,
  createRule,
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

  it('dispatches each group to its workflow destinations with enriched rule names and episode URLs', async () => {
    const { loggerService } = createLoggerService();
    const step = new DispatchStep(loggerService, mockWfm, 'https://my-kibana.example.com');

    mockWfm.getWorkflow.mockResolvedValue(createWorkflowDetailDto());
    mockWfm.scheduleWorkflow.mockResolvedValue('exec-1');

    const episode = createAlertEpisode({
      rule_id: 'rule-1',
      episode_id: 'ep-abc',
      data: { service: { name: 'frontend' }, event: { outcome: 'failure' }, count: 250 },
    });
    const rule = createRule({
      id: 'rule-1',
      name: 'Frontend error spike',
      groupingFields: ['service.name'],
    });
    const group = createNotificationGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
      episodes: [episode],
    });
    const policy = createNotificationPolicy({
      id: 'p1',
      name: 'Astronomy Shop Per-Episode',
      groupingMode: 'per_episode',
      apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==',
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
      rules: new Map([['rule-1', rule]]),
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
        policyName: 'Astronomy Shop Per-Episode',
        policyUrl: 'https://my-kibana.example.com/app/management/alertingV2/notification_policies/edit/p1',
        groupingMode: 'per_episode',
        workflowName: 'Test Workflow',
        workflowUrl: 'https://my-kibana.example.com/app/workflows/workflow-1',
        groupKey: group.groupKey,
        episodes: [expect.objectContaining({
          rule_id: 'rule-1',
          rule_name: 'Frontend error spike',
          rule_url: 'https://my-kibana.example.com/app/management/alertingV2/rules/rule-1',
          group_values: { 'service.name': 'frontend' },
          episode_url: 'https://my-kibana.example.com/app/management/alertingV2/episodes/ep-abc',
        })],
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'ApiKey dGVzdC1pZDp0ZXN0LWtleQ==',
        }),
      }),
      'notification_policy'
    );
  });

  it('skips dispatch when policy has no API key', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const step = new DispatchStep(loggerService, mockWfm, undefined);

    const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });
    const policy = createNotificationPolicy({ id: 'p1' });

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
    const step = new DispatchStep(loggerService, mockWfm, undefined);

    mockWfm.getWorkflow.mockResolvedValue(null);

    const group = createNotificationGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'missing-workflow' }],
    });
    const policy = createNotificationPolicy({
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
    const step = new DispatchStep(loggerService, mockWfm, undefined);

    mockWfm.getWorkflow.mockResolvedValue(createWorkflowDetailDto());
    mockWfm.scheduleWorkflow.mockResolvedValue('exec-1');

    const group = createNotificationGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [
        { type: 'workflow', id: 'workflow-1' },
        { type: 'workflow', id: 'workflow-2' },
      ],
    });
    const policy = createNotificationPolicy({
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
    const step = new DispatchStep(loggerService, mockWfm, undefined);

    const state = createDispatcherPipelineState({ dispatch: [] });
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(mockLogger.debug).not.toHaveBeenCalled();
  });

  it('continues when dispatch is undefined', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const step = new DispatchStep(loggerService, mockWfm, undefined);

    const state = createDispatcherPipelineState({});
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(mockLogger.debug).not.toHaveBeenCalled();
  });

  it('continues dispatching remaining groups when one group fails', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const step = new DispatchStep(loggerService, mockWfm, undefined);

    mockWfm.getWorkflow.mockResolvedValue(createWorkflowDetailDto());
    mockWfm.scheduleWorkflow
      .mockResolvedValueOnce('exec-1')
      .mockRejectedValueOnce(new Error('network timeout'))
      .mockResolvedValueOnce('exec-3');

    const policy = createNotificationPolicy({
      id: 'p1',
      apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==',
    });

    const groups = Array.from({ length: 3 }, (_, i) =>
      createNotificationGroup({
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
    const step = new DispatchStep(loggerService, mockWfm, undefined);

    mockWfm.getWorkflow.mockResolvedValue(createWorkflowDetailDto());
    mockWfm.scheduleWorkflow.mockRejectedValue(new Error('service unavailable'));

    const group = createNotificationGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
    const policy = createNotificationPolicy({
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
    const step = new DispatchStep(loggerService, mockWfm, undefined);

    mockWfm.getWorkflow.mockResolvedValue(createWorkflowDetailDto());
    mockWfm.scheduleWorkflow
      .mockRejectedValueOnce(new Error('workflow-1 failed'))
      .mockResolvedValueOnce('exec-2');

    const group = createNotificationGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [
        { type: 'workflow', id: 'workflow-1' },
        { type: 'workflow', id: 'workflow-2' },
      ],
    });
    const policy = createNotificationPolicy({
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
    const step = new DispatchStep(loggerService, mockWfm, undefined);

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

    const policy = createNotificationPolicy({
      id: 'p1',
      apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==',
    });

    const groups = Array.from({ length: 5 }, (_, i) =>
      createNotificationGroup({
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
