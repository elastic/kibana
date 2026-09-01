/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkScheduleWorkflowResult, WorkflowDetailDto } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { DISPATCH_CHUNK_SIZE } from '../constants';
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

const API_KEY = 'dGVzdC1pZDp0ZXN0LWtleQ==';

const getFailures = (result: Awaited<ReturnType<DispatchStep['execute']>>): DispatchFailure[] =>
  result.type === 'continue' ? [...(result.data?.outcome?.failures ?? [])] : [];

const getExecutionIds = (
  result: Awaited<ReturnType<DispatchStep['execute']>>,
  groupId: string
): readonly string[] =>
  result.type === 'continue' ? result.data?.outcome?.executionIdsFor(groupId) ?? [] : [];

const getScheduledGroupCount = (result: Awaited<ReturnType<DispatchStep['execute']>>): number =>
  result.type === 'continue' ? result.data?.outcome?.scheduledGroupCount ?? 0 : 0;

const createMockWorkflowsManagement = (): jest.Mocked<WorkflowsServerPluginSetup['management']> =>
  ({
    getWorkflowsByIds: jest.fn().mockResolvedValue([]),
    bulkScheduleWorkflow: jest.fn().mockResolvedValue([]),
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

const scheduled = (workflowExecutionId: string): BulkScheduleWorkflowResult[number] => ({
  status: 'scheduled',
  workflowExecutionId,
});

const scheduleError = (message: string): BulkScheduleWorkflowResult[number] => ({
  status: 'error',
  error: { message },
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

    mockWfm.getWorkflowsByIds.mockResolvedValue([createWorkflowDetailDto()]);
    mockWfm.bulkScheduleWorkflow.mockResolvedValue([scheduled('exec-1')]);

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
    const policy = createActionPolicy({
      id: 'p1',
      apiKey: API_KEY,
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
    });

    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    expect(getExecutionIds(result, 'g1')).toEqual(['exec-1']);
    expect(getScheduledGroupCount(result)).toBe(1);
    expect(mockWfm.getWorkflowsByIds).toHaveBeenCalledTimes(1);
    expect(mockWfm.getWorkflowsByIds).toHaveBeenCalledWith(['workflow-1'], 'default');
    expect(mockWfm.bulkScheduleWorkflow).toHaveBeenCalledTimes(1);
    expect(mockWfm.bulkScheduleWorkflow).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          workflow: expect.objectContaining({ id: 'workflow-1', name: 'Test Workflow' }),
          spaceId: 'default',
          inputs: expect.objectContaining({
            payload: expect.objectContaining({
              id: 'g1',
              policyId: 'p1',
              groupKey: group.groupKey,
              episodes: group.episodes,
            }),
          }),
          triggeredBy: 'action_policy',
        }),
      ],
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: `ApiKey ${API_KEY}`,
        }),
      })
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
    expect(mockWfm.getWorkflowsByIds).not.toHaveBeenCalled();
    expect(mockWfm.bulkScheduleWorkflow).not.toHaveBeenCalled();
  });

  it('skips dispatch when workflow is not found', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflowsByIds.mockResolvedValue([]);

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'missing-workflow' }],
    });
    const policy = createActionPolicy({
      id: 'p1',
      apiKey: API_KEY,
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
    });

    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockWfm.bulkScheduleWorkflow).not.toHaveBeenCalled();
  });

  it('dispatches to multiple workflow destinations', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflowsByIds.mockResolvedValue([
      createWorkflowDetailDto({ id: 'workflow-1' }),
      createWorkflowDetailDto({ id: 'workflow-2' }),
    ]);
    mockWfm.bulkScheduleWorkflow.mockResolvedValue([scheduled('exec-1'), scheduled('exec-2')]);

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
      apiKey: API_KEY,
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
    });

    const result = await step.execute(state, loggerService);

    expect(mockWfm.getWorkflowsByIds).toHaveBeenCalledTimes(1);
    expect(mockWfm.getWorkflowsByIds).toHaveBeenCalledWith(['workflow-1', 'workflow-2'], 'default');
    expect(mockWfm.bulkScheduleWorkflow).toHaveBeenCalledTimes(1);
    expect(mockWfm.bulkScheduleWorkflow.mock.calls[0][0]).toHaveLength(2);
    expect(getExecutionIds(result, 'g1')).toEqual(['exec-1', 'exec-2']);
    expect(getScheduledGroupCount(result)).toBe(1);
  });

  it('continues with no-op when dispatch is empty', async () => {
    const step = new DispatchStep(mockWfm);

    const state = createDispatcherPipelineState({ dispatch: [] });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    expect(mockLogger.debug).not.toHaveBeenCalled();
    expect(mockWfm.getWorkflowsByIds).not.toHaveBeenCalled();
  });

  it('continues when dispatch is undefined', async () => {
    const step = new DispatchStep(mockWfm);

    const state = createDispatcherPipelineState({});
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    expect(mockLogger.debug).not.toHaveBeenCalled();
    expect(mockWfm.getWorkflowsByIds).not.toHaveBeenCalled();
  });

  it('continues dispatching remaining groups when one group fails', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflowsByIds.mockResolvedValue([createWorkflowDetailDto()]);
    mockWfm.bulkScheduleWorkflow.mockResolvedValue([
      scheduled('exec-1'),
      scheduleError('network timeout'),
      scheduled('exec-3'),
    ]);

    const policy = createActionPolicy({
      id: 'p1',
      apiKey: API_KEY,
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
    expect(mockWfm.getWorkflowsByIds).toHaveBeenCalledTimes(1);
    expect(mockWfm.bulkScheduleWorkflow).toHaveBeenCalledTimes(1);
    expect(getExecutionIds(result, 'g0')).toEqual(['exec-1']);
    expect(getExecutionIds(result, 'g2')).toEqual(['exec-3']);
    expect(getScheduledGroupCount(result)).toBe(2);
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith('network timeout', expect.anything());
  });

  it('logs error when scheduleWorkflow throws', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflowsByIds.mockResolvedValue([createWorkflowDetailDto()]);
    mockWfm.bulkScheduleWorkflow.mockRejectedValue(new Error('service unavailable'));

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
    const policy = createActionPolicy({
      id: 'p1',
      apiKey: API_KEY,
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

    mockWfm.getWorkflowsByIds.mockResolvedValue([
      createWorkflowDetailDto({ id: 'workflow-1' }),
      createWorkflowDetailDto({ id: 'workflow-2' }),
    ]);
    mockWfm.bulkScheduleWorkflow.mockResolvedValue([
      scheduleError('workflow-1 failed'),
      scheduled('exec-2'),
    ]);

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
      apiKey: API_KEY,
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
    });

    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    expect(mockWfm.bulkScheduleWorkflow).toHaveBeenCalledTimes(1);
    expect(getExecutionIds(result, 'g1')).toEqual(['exec-2']);
    expect(getScheduledGroupCount(result)).toBe(1);
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
  });

  it('includes rule metadata in the workflow payload', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflowsByIds.mockResolvedValue([createWorkflowDetailDto()]);
    mockWfm.bulkScheduleWorkflow.mockResolvedValue([scheduled('exec-1')]);

    const episode = createAlertEpisode({ rule_id: 'rule-1' });
    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
      episodes: [episode],
      rules: { 'rule-1': { name: 'CPU spike monitor' } },
    });
    const policy = createActionPolicy({ id: 'p1', apiKey: API_KEY });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
    });

    await step.execute(state, loggerService);

    expect(mockWfm.bulkScheduleWorkflow).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          inputs: expect.objectContaining({
            payload: expect.objectContaining({
              rules: { 'rule-1': { name: 'CPU spike monitor' } },
            }),
          }),
        }),
      ],
      expect.anything()
    );
  });

  it('omits rules missing from state.rules in the payload', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflowsByIds.mockResolvedValue([createWorkflowDetailDto()]);
    mockWfm.bulkScheduleWorkflow.mockResolvedValue([scheduled('exec-1')]);

    const episode = createAlertEpisode({ rule_id: 'rule-unknown' });
    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
      episodes: [episode],
      rules: {},
    });
    const policy = createActionPolicy({ id: 'p1', apiKey: API_KEY });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
      rules: new Map(),
    });

    await step.execute(state, loggerService);

    expect(mockWfm.bulkScheduleWorkflow).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          inputs: expect.objectContaining({ payload: expect.objectContaining({ rules: {} }) }),
        }),
      ],
      expect.anything()
    );
  });

  it('records no dispatch failures on a fully successful run', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflowsByIds.mockResolvedValue([createWorkflowDetailDto()]);
    mockWfm.bulkScheduleWorkflow.mockResolvedValue([scheduled('exec-1')]);

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
    const policy = createActionPolicy({ id: 'p1', apiKey: API_KEY });

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
    expect(mockWfm.getWorkflowsByIds).not.toHaveBeenCalled();
    expect(mockWfm.bulkScheduleWorkflow).not.toHaveBeenCalled();
  });

  it('records a workflow_not_found failure when the destination workflow is missing', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflowsByIds.mockResolvedValue([]);

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'missing-workflow' }],
    });
    const policy = createActionPolicy({ id: 'p1', apiKey: API_KEY });

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
    expect(mockWfm.bulkScheduleWorkflow).not.toHaveBeenCalled();
  });

  it('records a workflow_disabled failure when the destination workflow is disabled', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflowsByIds.mockResolvedValue([createWorkflowDetailDto({ enabled: false })]);

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
    const policy = createActionPolicy({ id: 'p1', apiKey: API_KEY });

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
    expect(mockWfm.bulkScheduleWorkflow).not.toHaveBeenCalled();
  });

  it('records a schedule_error failure with the thrown message when scheduling fails', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflowsByIds.mockResolvedValue([createWorkflowDetailDto()]);
    mockWfm.bulkScheduleWorkflow.mockRejectedValue(new Error('service unavailable'));

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
    const policy = createActionPolicy({ id: 'p1', apiKey: API_KEY });

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

    mockWfm.getWorkflowsByIds.mockResolvedValue([
      createWorkflowDetailDto({ id: 'workflow-1' }),
      createWorkflowDetailDto({ id: 'workflow-2' }),
    ]);
    mockWfm.bulkScheduleWorkflow.mockResolvedValue([
      scheduled('exec-1'),
      scheduleError('workflow-2 failed'),
    ]);

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [
        { type: 'workflow', id: 'workflow-1' },
        { type: 'workflow', id: 'workflow-2' },
      ],
    });
    const policy = createActionPolicy({ id: 'p1', apiKey: API_KEY });

    const result = await step.execute(
      createDispatcherPipelineState({ dispatch: [group], policies: new Map([['p1', policy]]) }),
      loggerService
    );

    expect(getExecutionIds(result, 'g1')).toEqual(['exec-1']);
    expect(getScheduledGroupCount(result)).toBe(1);
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

    const policy = createActionPolicy({ id: 'p1', apiKey: API_KEY });

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

    expect(getExecutionIds(result, 'g1')).toEqual([]);
    expect(getExecutionIds(result, 'g2')).toEqual([]);
    expect(result.data?.outcome?.failures).toHaveLength(0);
    expect(mockWfm.getWorkflowsByIds).not.toHaveBeenCalled();
    expect(mockWfm.bulkScheduleWorkflow).not.toHaveBeenCalled();
  });

  it('prefetches workflows once per space', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflowsByIds.mockImplementation(async (ids: string[]) =>
      ids.map((id) => createWorkflowDetailDto({ id }))
    );
    mockWfm.bulkScheduleWorkflow.mockResolvedValue([scheduled('exec-a'), scheduled('exec-b')]);

    const policy = createActionPolicy({ id: 'p1', apiKey: API_KEY });
    const groups = [
      createActionGroup({
        id: 'g1',
        policyId: 'p1',
        spaceId: 'space-a',
        destinations: [{ type: 'workflow', id: 'workflow-1' }],
      }),
      createActionGroup({
        id: 'g2',
        policyId: 'p1',
        spaceId: 'space-b',
        destinations: [{ type: 'workflow', id: 'workflow-1' }],
      }),
    ];

    await step.execute(
      createDispatcherPipelineState({
        dispatch: groups,
        policies: new Map([['p1', policy]]),
      }),
      loggerService
    );

    expect(mockWfm.getWorkflowsByIds).toHaveBeenCalledTimes(2);
    expect(mockWfm.getWorkflowsByIds).toHaveBeenCalledWith(['workflow-1'], 'space-a');
    expect(mockWfm.getWorkflowsByIds).toHaveBeenCalledWith(['workflow-1'], 'space-b');
  });

  it('issues one bulkScheduleWorkflow call per API key and never mixes keys', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflowsByIds.mockResolvedValue([createWorkflowDetailDto()]);
    mockWfm.bulkScheduleWorkflow.mockResolvedValue([scheduled('exec-1')]);

    const policyA = createActionPolicy({ id: 'p1', apiKey: 'key-a' });
    const policyB = createActionPolicy({ id: 'p2', apiKey: 'key-b' });
    const groups = [
      createActionGroup({
        id: 'g1',
        policyId: 'p1',
        destinations: [{ type: 'workflow', id: 'workflow-1' }],
      }),
      createActionGroup({
        id: 'g2',
        policyId: 'p2',
        destinations: [{ type: 'workflow', id: 'workflow-1' }],
      }),
    ];

    await step.execute(
      createDispatcherPipelineState({
        dispatch: groups,
        policies: new Map([
          ['p1', policyA],
          ['p2', policyB],
        ]),
      }),
      loggerService
    );

    expect(mockWfm.bulkScheduleWorkflow).toHaveBeenCalledTimes(2);
    const authorizations = mockWfm.bulkScheduleWorkflow.mock.calls.map(
      ([, request]) => request.headers.authorization
    );
    expect(authorizations).toEqual(['ApiKey key-a', 'ApiKey key-b']);
    expect(mockWfm.bulkScheduleWorkflow.mock.calls[0][0]).toHaveLength(1);
    expect(mockWfm.bulkScheduleWorkflow.mock.calls[1][0]).toHaveLength(1);
  });

  it('records schedule_error for every destination in a space when prefetch throws', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflowsByIds.mockImplementation(async (_ids: string[], spaceId: string) => {
      if (spaceId === 'space-a') {
        throw new Error('es down');
      }
      return [createWorkflowDetailDto()];
    });
    mockWfm.bulkScheduleWorkflow.mockResolvedValue([scheduled('exec-b')]);

    const policy = createActionPolicy({ id: 'p1', apiKey: API_KEY });
    const groups = [
      createActionGroup({
        id: 'g1',
        policyId: 'p1',
        spaceId: 'space-a',
        destinations: [{ type: 'workflow', id: 'workflow-1' }],
      }),
      createActionGroup({
        id: 'g2',
        policyId: 'p1',
        spaceId: 'space-b',
        destinations: [{ type: 'workflow', id: 'workflow-1' }],
      }),
    ];

    const result = await step.execute(
      createDispatcherPipelineState({
        dispatch: groups,
        policies: new Map([['p1', policy]]),
      }),
      loggerService
    );

    const failures = getFailures(result);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      actionGroupId: 'g1',
      workflowId: 'workflow-1',
      reason: DISPATCH_FAILURE_REASONS.SCHEDULE_ERROR,
      message: 'es down',
    });
    expect(getExecutionIds(result, 'g2')).toEqual(['exec-b']);
    expect(getScheduledGroupCount(result)).toBe(1);
  });

  it('records schedule_error when scheduling returns no execution id', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflowsByIds.mockResolvedValue([createWorkflowDetailDto()]);
    mockWfm.bulkScheduleWorkflow.mockResolvedValue([scheduled('')]);

    const group = createActionGroup({
      id: 'g1',
      policyId: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
    const policy = createActionPolicy({ id: 'p1', apiKey: API_KEY });

    const result = await step.execute(
      createDispatcherPipelineState({ dispatch: [group], policies: new Map([['p1', policy]]) }),
      loggerService
    );

    const failures = getFailures(result);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      actionGroupId: 'g1',
      reason: DISPATCH_FAILURE_REASONS.SCHEDULE_ERROR,
    });
    expect(getExecutionIds(result, 'g1')).toEqual([]);
  });

  it('does not start a second chunk once the signal is aborted', async () => {
    const step = new DispatchStep(mockWfm);
    const controller = new AbortController();

    mockWfm.getWorkflowsByIds.mockResolvedValue([createWorkflowDetailDto()]);
    mockWfm.bulkScheduleWorkflow.mockImplementation(async (items) => {
      controller.abort();
      return items.map((_, i) => scheduled(`exec-${i}`));
    });

    const policy = createActionPolicy({ id: 'p1', apiKey: API_KEY });
    const groups = Array.from({ length: DISPATCH_CHUNK_SIZE + 1 }, (_, i) =>
      createActionGroup({
        id: `g${i}`,
        policyId: 'p1',
        destinations: [{ type: 'workflow', id: 'workflow-1' }],
      })
    );

    const result = await step.execute(
      createDispatcherPipelineState({
        dispatch: groups,
        policies: new Map([['p1', policy]]),
        input: createDispatcherPipelineInput({ signal: controller.signal }),
      }),
      loggerService
    );

    expect(mockWfm.bulkScheduleWorkflow).toHaveBeenCalledTimes(1);
    expect(mockWfm.bulkScheduleWorkflow.mock.calls[0][0]).toHaveLength(DISPATCH_CHUNK_SIZE);
    expect(getScheduledGroupCount(result)).toBe(DISPATCH_CHUNK_SIZE);
    expect(getExecutionIds(result, 'g0')).not.toEqual([]);
    expect(getExecutionIds(result, `g${DISPATCH_CHUNK_SIZE}`)).toEqual([]);
    expect(getFailures(result)).toHaveLength(0);
  });

  it('continues other API keys when one chunk throws', async () => {
    const step = new DispatchStep(mockWfm);

    mockWfm.getWorkflowsByIds.mockResolvedValue([createWorkflowDetailDto()]);
    mockWfm.bulkScheduleWorkflow.mockImplementation(async (_items, request) => {
      if (request.headers.authorization === 'ApiKey key-a') {
        throw new Error('key-a failed');
      }
      return [scheduled('exec-b')];
    });

    const result = await step.execute(
      createDispatcherPipelineState({
        dispatch: [
          createActionGroup({
            id: 'g1',
            policyId: 'p1',
            destinations: [{ type: 'workflow', id: 'workflow-1' }],
          }),
          createActionGroup({
            id: 'g2',
            policyId: 'p2',
            destinations: [{ type: 'workflow', id: 'workflow-1' }],
          }),
        ],
        policies: new Map([
          ['p1', createActionPolicy({ id: 'p1', apiKey: 'key-a' })],
          ['p2', createActionPolicy({ id: 'p2', apiKey: 'key-b' })],
        ]),
      }),
      loggerService
    );

    expect(getFailures(result)).toHaveLength(1);
    expect(getFailures(result)[0]).toMatchObject({
      actionGroupId: 'g1',
      reason: DISPATCH_FAILURE_REASONS.SCHEDULE_ERROR,
      message: 'key-a failed',
    });
    expect(getExecutionIds(result, 'g2')).toEqual(['exec-b']);
    expect(getScheduledGroupCount(result)).toBe(1);
  });
});
