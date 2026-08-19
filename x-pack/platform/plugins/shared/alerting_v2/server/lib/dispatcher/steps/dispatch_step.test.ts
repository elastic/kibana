/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowDetailDto } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import {
  createActionGroup,
  createActionPolicy,
  createAlertEpisode,
  createDispatcherPipelineInput,
  createDispatcherPipelineState,
} from '../fixtures/test_utils';
import type { DispatchFailure } from '../types';
import { DISPATCH_FAILURE_REASONS } from './constants';
import { DispatchStep } from './dispatch_step';

const getFailures = (result: Awaited<ReturnType<DispatchStep['execute']>>): DispatchFailure[] =>
  result.type === 'continue' ? result.data?.dispatchFailures ?? [] : [];

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
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];

  beforeEach(() => {
    mockWfm = createMockWorkflowsManagement();
    ({ loggerService, mockLogger } = createLoggerService());
  });

  afterEach(() => jest.clearAllMocks());

  it('dispatches each group to its workflow destinations', async () => {
    const step = new DispatchStep(mockWfm);

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

    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    expect(result.type === 'continue' && result.data?.dispatchedExecutions).toEqual(
      new Map([['g1', ['exec-1']]])
    );
    expect(mockWfm.getWorkflow).toHaveBeenCalledWith('workflow-1', 'default');
    expect(mockWfm.scheduleWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'workflow-1', name: 'Test Workflow' }),
      'default',
      expect.objectContaining({
        payload: expect.objectContaining({
          id: 'g1',
          policyId: 'p1',
          groupKey: group.groupKey,
          episodes: group.episodes,
        }),
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
    const step = new DispatchStep(mockWfm);

    const group = createActionGroup({ id: 'g1', policyId: 'p1' });
    const policy = createActionPolicy({ id: 'p1' });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
    });

    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockWfm.getWorkflow).not.toHaveBeenCalled();
    expect(mockWfm.scheduleWorkflow).not.toHaveBeenCalled();
  });

  it('skips dispatch when workflow is not found', async () => {
    const step = new DispatchStep(mockWfm);

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

    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockWfm.scheduleWorkflow).not.toHaveBeenCalled();
  });

  it('dispatches to multiple workflow destinations', async () => {
    const step = new DispatchStep(mockWfm);

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

    await step.execute(state, loggerService);

    expect(mockWfm.getWorkflow).toHaveBeenCalledTimes(2);
    expect(mockWfm.scheduleWorkflow).toHaveBeenCalledTimes(2);
  });

  it('continues with no-op when dispatch is empty', async () => {
    const step = new DispatchStep(mockWfm);

    const state = createDispatcherPipelineState({ dispatch: [] });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    expect(mockLogger.debug).not.toHaveBeenCalled();
  });

  it('continues when dispatch is undefined', async () => {
    const step = new DispatchStep(mockWfm);

    const state = createDispatcherPipelineState({});
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    expect(mockLogger.debug).not.toHaveBeenCalled();
  });

  it('continues dispatching remaining groups when one group fails', async () => {
    const step = new DispatchStep(mockWfm);

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

    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    expect(mockWfm.getWorkflow).toHaveBeenCalledTimes(3);
    expect(mockWfm.scheduleWorkflow).toHaveBeenCalledTimes(3);
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith('network timeout', expect.anything());
  });

  it('logs error when scheduleWorkflow throws', async () => {
    const step = new DispatchStep(mockWfm);

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

    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith('service unavailable', {
      labels: {
        group_id: 'g1',
        policy_id: 'p1',
        workflow_id: 'workflow-1',
        space_id: 'default',
        code: ALERTING_LOG_CODES.DISPATCH_WORKFLOW_SCHEDULE_FAILED,
      },
      error: expect.objectContaining({ message: 'service unavailable' }),
    });
  });

  it('continues dispatching remaining destinations when one destination fails', async () => {
    const step = new DispatchStep(mockWfm);

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

    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    expect(mockWfm.scheduleWorkflow).toHaveBeenCalledTimes(2);
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
  });

  it('includes rule metadata in the workflow payload', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflow.mockResolvedValue(createWorkflowDetailDto());
    mockWfm.scheduleWorkflow.mockResolvedValue('exec-1');

    const episode = createAlertEpisode({ rule_id: 'rule-1' });
    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
      episodes: [episode],
      rules: { 'rule-1': { name: 'CPU spike monitor' } },
    });
    const policy = createActionPolicy({ id: 'p1', apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==' });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
    });

    await step.execute(state, loggerService);

    expect(mockWfm.scheduleWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        payload: expect.objectContaining({
          rules: { 'rule-1': { name: 'CPU spike monitor' } },
        }),
      }),
      expect.anything(),
      expect.anything()
    );
  });

  it('omits rules missing from state.rules in the payload', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflow.mockResolvedValue(createWorkflowDetailDto());
    mockWfm.scheduleWorkflow.mockResolvedValue('exec-1');

    const episode = createAlertEpisode({ rule_id: 'rule-unknown' });
    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
      episodes: [episode],
      rules: {},
    });
    const policy = createActionPolicy({ id: 'p1', apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==' });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
      rules: new Map(), // rule-unknown not present
    });

    await step.execute(state, loggerService);

    expect(mockWfm.scheduleWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ payload: expect.objectContaining({ rules: {} }) }),
      expect.anything(),
      expect.anything()
    );
  });

  it('dispatches multiple groups concurrently with a max concurrency of 3', async () => {
    jest.useFakeTimers();
    const step = new DispatchStep(mockWfm);

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

    const executePromise = step.execute(state, loggerService);

    await jest.advanceTimersByTimeAsync(100);

    const result = await executePromise;

    expect(result.type).toBe('continue');
    expect(mockWfm.scheduleWorkflow).toHaveBeenCalledTimes(5);
    expect(maxInFlight).toBeLessThanOrEqual(3);

    jest.useRealTimers();
  });

  it('records no dispatch failures on a fully successful run', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflow.mockResolvedValue(createWorkflowDetailDto());
    mockWfm.scheduleWorkflow.mockResolvedValue('exec-1');

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
    const policy = createActionPolicy({ id: 'p1', apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==' });

    const result = await step.execute(
      createDispatcherPipelineState({ dispatch: [group], policies: new Map([['p1', policy]]) }),
      loggerService
    );

    expect(getFailures(result)).toEqual([]);
  });

  it('records a missing_api_key failure per destination when the policy has no API key', async () => {
    const step = new DispatchStep(mockWfm);

    const episode = createAlertEpisode({ rule_id: 'rule-1', episode_id: 'ep-1' });
    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      spaceId: 'default',
      episodes: [episode],
      destinations: [
        { type: 'workflow', id: 'workflow-1' },
        { type: 'workflow', id: 'workflow-2' },
      ],
    });
    const policy = createActionPolicy({ id: 'p1' });

    const result = await step.execute(
      createDispatcherPipelineState({ dispatch: [group], policies: new Map([['p1', policy]]) }),
      loggerService
    );

    const failures = getFailures(result);
    expect(failures).toEqual([
      {
        policyId: 'p1',
        spaceId: 'default',
        actionGroupId: 'g1',
        workflowId: 'workflow-1',
        episodes: [episode],
        reason: DISPATCH_FAILURE_REASONS.MISSING_API_KEY,
        message: expect.stringContaining('No API key found for policy p1'),
      },
      {
        policyId: 'p1',
        spaceId: 'default',
        actionGroupId: 'g1',
        workflowId: 'workflow-2',
        episodes: [episode],
        reason: DISPATCH_FAILURE_REASONS.MISSING_API_KEY,
        message: expect.stringContaining('No API key found for policy p1'),
      },
    ]);
  });

  it('records a workflow_not_found failure when the destination workflow is missing', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflow.mockResolvedValue(null);

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'missing-workflow' }],
    });
    const policy = createActionPolicy({ id: 'p1', apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==' });

    const result = await step.execute(
      createDispatcherPipelineState({ dispatch: [group], policies: new Map([['p1', policy]]) }),
      loggerService
    );

    const failures = getFailures(result);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      actionGroupId: 'g1',
      workflowId: 'missing-workflow',
      reason: DISPATCH_FAILURE_REASONS.WORKFLOW_NOT_FOUND,
    });
  });

  it('records a workflow_disabled failure when the destination workflow is disabled', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflow.mockResolvedValue(createWorkflowDetailDto({ enabled: false }));

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
    const policy = createActionPolicy({ id: 'p1', apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==' });

    const result = await step.execute(
      createDispatcherPipelineState({ dispatch: [group], policies: new Map([['p1', policy]]) }),
      loggerService
    );

    const failures = getFailures(result);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      actionGroupId: 'g1',
      workflowId: 'workflow-1',
      reason: DISPATCH_FAILURE_REASONS.WORKFLOW_DISABLED,
    });
    expect(mockWfm.scheduleWorkflow).not.toHaveBeenCalled();
  });

  it('records a schedule_error failure with the thrown message when scheduling fails', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflow.mockResolvedValue(createWorkflowDetailDto());
    mockWfm.scheduleWorkflow.mockRejectedValue(new Error('service unavailable'));

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
    const policy = createActionPolicy({ id: 'p1', apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==' });

    const result = await step.execute(
      createDispatcherPipelineState({ dispatch: [group], policies: new Map([['p1', policy]]) }),
      loggerService
    );

    const failures = getFailures(result);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      actionGroupId: 'g1',
      workflowId: 'workflow-1',
      reason: DISPATCH_FAILURE_REASONS.SCHEDULE_ERROR,
      message: 'service unavailable',
    });
  });

  it('records only the failed destination when a group partially succeeds', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflow.mockResolvedValue(createWorkflowDetailDto());
    mockWfm.scheduleWorkflow
      .mockResolvedValueOnce('exec-1')
      .mockRejectedValueOnce(new Error('workflow-2 failed'));

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [
        { type: 'workflow', id: 'workflow-1' },
        { type: 'workflow', id: 'workflow-2' },
      ],
    });
    const policy = createActionPolicy({ id: 'p1', apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==' });

    const result = await step.execute(
      createDispatcherPipelineState({ dispatch: [group], policies: new Map([['p1', policy]]) }),
      loggerService
    );

    expect(result.type === 'continue' && result.data?.dispatchedExecutions).toEqual(
      new Map([['g1', ['exec-1']]])
    );
    const failures = getFailures(result);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      workflowId: 'workflow-2',
      reason: DISPATCH_FAILURE_REASONS.SCHEDULE_ERROR,
    });
  });

  it('skips all groups when signal is already aborted, records no executions and no failures', async () => {
    const step = new DispatchStep(mockWfm);
    const controller = new AbortController();
    controller.abort();

    const policy = createActionPolicy({ id: 'p1', apiKey: 'dGVzdC1pZDp0ZXN0LWtleQ==' });

    const group1 = createActionGroup({ id: 'g1', policyId: 'p1' });
    const group2 = createActionGroup({ id: 'g2', policyId: 'p1' });

    const result = await step.execute(
      createDispatcherPipelineState({
        dispatch: [group1, group2],
        policies: new Map([['p1', policy]]),
        input: createDispatcherPipelineInput({ signal: controller.signal }),
      }),
      loggerService
    );

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;

    // no executions dispatched
    const executionIds = result.data?.dispatchedExecutions;
    expect(executionIds?.get('g1')).toBeUndefined();
    expect(executionIds?.get('g2')).toBeUndefined();
    // no failures — groups were silently skipped
    expect(result.data?.dispatchFailures).toHaveLength(0);
    expect(mockWfm.scheduleWorkflow).not.toHaveBeenCalled();
  });
});
