/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonValue } from '@kbn/utility-types';
import type { EsWorkflowExecution, StackFrame, WorkflowAwaitExecutionsStep } from '@kbn/workflows';
import { ExecutionStatus, WORKFLOW_AWAIT_EXECUTIONS_MAX_IDS } from '@kbn/workflows';
import type {
  DurablePhaseResult,
  PollHandlerContext,
  StepHandlerContext,
} from '@kbn/workflows-extensions/server';
import {
  type AwaitExecutionsStepDependencies,
  createAwaitExecutionsStepDefinition,
} from './workflow_await_executions_step_definition';
import type { StepExecutionRepository } from '../../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../../repositories/workflow_execution_repository';
import type { StepExecutionMetadata } from '../../workflow_context_manager/workflow_execution_state';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';

const PARENT_EXECUTION_ID = 'parent-exec';
const SPACE_ID = 'default';
const AWAIT_STEP_ID = 'join';
const AWAIT_STEP_EXECUTION_ID = 'join-exec';

const iterationFrames = (iteration: number): StackFrame[] => [
  {
    stepId: 'per_host',
    nestedScopes: [{ nodeId: 'enterForeach_per_host', nodeType: 'enter-foreach' }],
  },
  {
    stepId: `iteration-${iteration}`,
    nestedScopes: [
      {
        nodeId: `enterSynthetic_enterForeach_per_host_iteration-${iteration}`,
        nodeType: 'enter-foreach-iteration',
      },
    ],
  },
];

const buildExecution = (
  id: string,
  status: ExecutionStatus,
  overrides: Partial<EsWorkflowExecution> = {}
): EsWorkflowExecution =>
  ({
    id,
    spaceId: SPACE_ID,
    workflowId: `workflow-of-${id}`,
    status,
    startedAt: '2026-11-18T10:00:00.000Z',
    stepExecutionIds: [],
    context: { parentWorkflowExecutionId: PARENT_EXECUTION_ID },
    ...overrides,
  } as unknown as EsWorkflowExecution);

describe('createAwaitExecutionsStepDefinition', () => {
  let executions: EsWorkflowExecution[];
  let dependencies: AwaitExecutionsStepDependencies;
  let rehydrateStepOutputs: jest.Mock;
  let releaseReadOutputPins: jest.Mock;
  let innerStepIdsByStep: Record<string, string[]>;
  let stepExecutions: StepExecutionMetadata[];
  let stepOutputs: Record<string, JsonValue>;
  let awaitScopeStack: StackFrame[];

  const addStartStepExecution = (
    stepId: string,
    executionId: string,
    status: ExecutionStatus = ExecutionStatus.COMPLETED,
    scopeStack: StackFrame[] = []
  ): void => {
    const id = `step-exec-${stepExecutions.length}`;
    stepExecutions.push({
      id,
      stepId,
      stepType: 'workflow.executeAsync',
      status,
      scopeStack,
      globalExecutionIndex: stepExecutions.length,
    } as StepExecutionMetadata);
    stepOutputs[id] = { executionId, workflowId: `workflow-of-${executionId}`, awaited: false };
  };

  const start = (input: WorkflowAwaitExecutionsStep['with']): Promise<DurablePhaseResult> => {
    const { start: startHandler } = createAwaitExecutionsStepDefinition(dependencies);
    if (!startHandler) {
      throw new Error('workflow.awaitExecutions has no start handler');
    }
    return startHandler({ input, stepId: AWAIT_STEP_ID } as StepHandlerContext<never>);
  };

  const poll = (state: unknown): Promise<DurablePhaseResult> =>
    createAwaitExecutionsStepDefinition(dependencies).poll({ state } as PollHandlerContext<never>);

  beforeEach(() => {
    executions = [];
    innerStepIdsByStep = {};
    stepExecutions = [];
    stepOutputs = {};
    awaitScopeStack = [];
    rehydrateStepOutputs = jest.fn().mockResolvedValue(undefined);
    releaseReadOutputPins = jest.fn();

    const readExecutions = async (ids: string[]) =>
      new Map(
        executions
          .filter(({ id }) => ids.includes(id))
          .map((execution) => [execution.id, execution])
      );
    dependencies = {
      stepExecutionRuntime: {
        workflowExecution: { id: PARENT_EXECUTION_ID },
        stepExecutionId: AWAIT_STEP_EXECUTION_ID,
        rehydrateStepOutputs,
        releaseReadOutputPins,
      } as unknown as AwaitExecutionsStepDependencies['stepExecutionRuntime'],
      workflowExecutionRepository: {
        getWorkflowExecutionStatusesByIds: jest.fn(
          async (ids: string[]) =>
            new Map([...(await readExecutions(ids))].map(([id, { status }]) => [id, status]))
        ),
        getWorkflowExecutionsByIds: jest.fn(readExecutions),
      } as unknown as jest.Mocked<WorkflowExecutionRepository>,
      stepExecutionRepository: {
        getStepExecutionsByWorkflowExecution: jest.fn().mockResolvedValue([]),
      } as unknown as jest.Mocked<StepExecutionRepository>,
      workflowGraph: {
        hasStep: (stepId: string) => stepId in innerStepIdsByStep,
        getInnerStepIds: (stepId: string) => new Set(innerStepIdsByStep[stepId]),
      },
      workflowExecutionState: {
        getAllStepExecutions: () => stepExecutions,
        getStepExecution: (id: string) =>
          id === AWAIT_STEP_EXECUTION_ID ? { scopeStack: awaitScopeStack } : undefined,
      } as unknown as AwaitExecutionsStepDependencies['workflowExecutionState'],
      stepIoService: {
        getStepOutput: (stepExecutionId: string) => stepOutputs[stepExecutionId],
      },
      spaceId: SPACE_ID,
      workflowLogger: { logDebug: jest.fn() } as unknown as IWorkflowEventLogger,
    };
  });

  it('completes on start with each output when every execution already completed', async () => {
    executions = [
      buildExecution('a', ExecutionStatus.COMPLETED, {
        context: { parentWorkflowExecutionId: PARENT_EXECUTION_ID, output: { verdict: 'ok' } },
      }),
      buildExecution('b', ExecutionStatus.COMPLETED, {
        context: { parentWorkflowExecutionId: PARENT_EXECUTION_ID, output: { verdict: 'noop' } },
      }),
    ];

    await expect(start({ 'execution-ids': ['a', 'b'] })).resolves.toEqual({
      output: {
        results: [
          expect.objectContaining({
            executionId: 'a',
            status: 'completed',
            output: { verdict: 'ok' },
          }),
          expect.objectContaining({
            executionId: 'b',
            status: 'completed',
            output: { verdict: 'noop' },
          }),
        ],
      },
    });
  });

  it('hands the resolved executions to polling while one is still running', async () => {
    executions = [
      buildExecution('a', ExecutionStatus.COMPLETED),
      buildExecution('b', ExecutionStatus.RUNNING),
    ];

    const state = { executionIds: ['a', 'b'], mode: 'fail-fast' };
    await expect(start({ 'execution-ids': ['a', 'b'] })).resolves.toEqual({ state });

    executions[1] = buildExecution('b', ExecutionStatus.COMPLETED);
    await expect(poll(state)).resolves.toEqual({
      output: {
        results: [
          expect.objectContaining({ executionId: 'a', status: 'completed' }),
          expect.objectContaining({ executionId: 'b', status: 'completed' }),
        ],
      },
    });
  });

  it('polls only the statuses and loads full documents only once the executions finish', async () => {
    const { getWorkflowExecutionStatusesByIds, getWorkflowExecutionsByIds } =
      dependencies.workflowExecutionRepository;
    executions = [
      buildExecution('a', ExecutionStatus.RUNNING),
      buildExecution('b', ExecutionStatus.RUNNING),
    ];

    await expect(poll({ executionIds: ['a', 'b'], mode: 'settled' })).resolves.toEqual({
      state: { executionIds: ['a', 'b'], mode: 'settled' },
    });
    expect(getWorkflowExecutionStatusesByIds).toHaveBeenCalledWith(['a', 'b'], SPACE_ID);
    expect(getWorkflowExecutionsByIds).not.toHaveBeenCalled();

    executions = [
      buildExecution('a', ExecutionStatus.COMPLETED),
      buildExecution('b', ExecutionStatus.FAILED),
    ];
    await poll({ executionIds: ['a', 'b'], mode: 'settled' });
    expect(getWorkflowExecutionsByIds).toHaveBeenCalledTimes(1);
    expect(getWorkflowExecutionsByIds).toHaveBeenCalledWith(['a', 'b'], SPACE_ID);
  });

  it('loads the full documents once when failing fast', async () => {
    executions = [
      buildExecution('a', ExecutionStatus.RUNNING),
      buildExecution('b', ExecutionStatus.FAILED),
    ];

    const { getWorkflowExecutionsByIds } = dependencies.workflowExecutionRepository;

    await poll({ executionIds: ['a', 'b'], mode: 'fail-fast' });

    expect(getWorkflowExecutionsByIds).toHaveBeenCalledTimes(1);
    expect(getWorkflowExecutionsByIds).toHaveBeenCalledWith(['a', 'b'], SPACE_ID);
  });

  it('checks lineage only at start, not on each poll', async () => {
    executions = [
      buildExecution('a', ExecutionStatus.RUNNING, {
        context: { parentWorkflowExecutionId: 'someone-else' },
      }),
    ];

    await expect(start({ 'execution-ids': 'a' })).rejects.toThrow(
      'Workflow execution not found: a.'
    );
    await expect(poll({ executionIds: ['a'], mode: 'fail-fast' })).resolves.toEqual({
      state: { executionIds: ['a'], mode: 'fail-fast' },
    });
  });

  it('fails a poll when an awaited execution disappeared', async () => {
    executions = [buildExecution('a', ExecutionStatus.RUNNING)];

    await expect(poll({ executionIds: ['a', 'gone'], mode: 'fail-fast' })).rejects.toThrow(
      'Workflow execution not found: gone.'
    );
  });

  it('fails fast on the first unsuccessful execution and keeps per-execution results', async () => {
    executions = [
      buildExecution('a', ExecutionStatus.RUNNING),
      buildExecution('b', ExecutionStatus.FAILED, {
        error: { type: 'Error', message: 'connector exploded' },
      }),
    ];

    const result = await poll({ executionIds: ['a', 'b'], mode: 'fail-fast' });

    expect(result?.error?.message).toBe(
      'Awaited execution b of workflow "workflow-of-b" ended with status failed: connector exploded'
    );
    expect(result?.output).toEqual({
      results: [
        expect.objectContaining({ executionId: 'a', status: 'running' }),
        expect.objectContaining({
          executionId: 'b',
          status: 'failed',
          error: { type: 'Error', message: 'connector exploded' },
        }),
      ],
    });
  });

  it('treats a cancelled execution as unsuccessful in fail-fast mode', async () => {
    executions = [
      buildExecution('a', ExecutionStatus.CANCELLED, { cancellationReason: 'stopped by user' }),
    ];

    const result = await start({ 'execution-ids': 'a' });

    expect(result?.error?.message).toContain(
      'ended with status cancelled: Sub-workflow execution cancelled: stopped by user'
    );
  });

  it('waits for every execution and succeeds in settled mode', async () => {
    executions = [
      buildExecution('a', ExecutionStatus.CANCELLED),
      buildExecution('b', ExecutionStatus.RUNNING),
    ];

    const state = { executionIds: ['a', 'b'], mode: 'settled' };
    await expect(start({ 'execution-ids': ['a', 'b'], mode: 'settled' })).resolves.toEqual({
      state,
    });

    executions[1] = buildExecution('b', ExecutionStatus.TIMED_OUT);
    await expect(poll(state)).resolves.toEqual({
      output: {
        results: [
          expect.objectContaining({ executionId: 'a', status: 'cancelled' }),
          expect.objectContaining({ executionId: 'b', status: 'timed_out' }),
        ],
      },
    });
  });

  it('accepts workflow.executeAsync outputs and removes duplicate IDs', async () => {
    executions = [buildExecution('a', ExecutionStatus.RUNNING)];

    await expect(
      start({
        'execution-ids': [{ executionId: 'a', awaited: false }, 'a'] as unknown as string[],
      })
    ).resolves.toEqual({ state: { executionIds: ['a'], mode: 'fail-fast' } });
  });

  it('fails with a clear error when an ID renders empty', async () => {
    await expect(start({ 'execution-ids': ['a', ''] })).rejects.toThrow(
      '"execution-ids" item 1 resolved to an empty string; expected a non-empty execution ID or a workflow.executeAsync output.'
    );
    expect(
      dependencies.workflowExecutionRepository.getWorkflowExecutionsByIds
    ).not.toHaveBeenCalled();
  });

  it.each([
    [{ token: 'secret-token', body: 'large payload' }, 'an object without an executionId field'],
    [{ executionId: 42, token: 'secret-token' }, 'an object whose executionId is a number'],
    [{ executionId: null }, 'an object whose executionId is no value'],
    [['nested'], 'a list'],
    [7, 'a number'],
    [null, 'no value'],
  ])('describes an invalid item by its kind without echoing it: %j', async (item, description) => {
    const rejection = start({ 'execution-ids': ['a', item] as unknown as string[] });

    await expect(rejection).rejects.toThrow(`"execution-ids" item 1 resolved to ${description};`);
    await expect(rejection).rejects.not.toThrow('secret-token');
  });

  it('fails when an execution does not exist', async () => {
    executions = [buildExecution('a', ExecutionStatus.COMPLETED)];

    await expect(start({ 'execution-ids': ['a', 'missing'] })).rejects.toThrow(
      'Workflow execution not found: missing. Only executions started by this workflow run can be awaited.'
    );
  });

  it('reports executions not started by this run as not found', async () => {
    executions = [
      buildExecution('unrelated', ExecutionStatus.COMPLETED, {
        context: { parentWorkflowExecutionId: 'someone-else' },
      }),
    ];

    await expect(start({ 'execution-ids': 'unrelated' })).rejects.toThrow(
      'Workflow execution not found: unrelated.'
    );
  });

  it('accepts executions started by a descendant of this run', async () => {
    executions = [
      buildExecution('grandchild', ExecutionStatus.COMPLETED, {
        context: {
          parentWorkflowExecutionId: 'child-exec',
          executionChain: [
            { executionId: PARENT_EXECUTION_ID, invocation: 'sync', workflowId: 'parent' },
            { executionId: 'child-exec', invocation: 'async', workflowId: 'child' },
          ],
        },
      }),
    ];

    await expect(start({ 'execution-ids': 'grandchild' })).resolves.toHaveProperty('output');
  });

  describe('from-steps', () => {
    it('awaits the execution started by a referenced workflow.executeAsync step', async () => {
      innerStepIdsByStep = { run_agent: [] };
      addStartStepExecution('run_agent', 'a');
      executions = [buildExecution('a', ExecutionStatus.COMPLETED)];

      await expect(start({ 'from-steps': ['run_agent'] })).resolves.toEqual({
        output: { results: [expect.objectContaining({ executionId: 'a', status: 'completed' })] },
      });
      expect(rehydrateStepOutputs).toHaveBeenCalledWith(['step-exec-0']);
      expect(releaseReadOutputPins).toHaveBeenCalled();
    });

    it('covers every branch and iteration nested in a referenced step, in run order', async () => {
      innerStepIdsByStep = { fan_out: ['branch_a', 'scan_host', 'unrelated_log'] };
      addStartStepExecution('scan_host', 'host-1');
      addStartStepExecution('branch_a', 'a');
      addStartStepExecution('scan_host', 'host-2');
      addStartStepExecution('scan_host', 'host-3', ExecutionStatus.FAILED);
      addStartStepExecution('outside_fan_out', 'other');
      executions = ['host-1', 'a', 'host-2'].map((id) =>
        buildExecution(id, ExecutionStatus.RUNNING)
      );

      await expect(start({ 'from-steps': ['fan_out'] })).resolves.toEqual({
        state: { executionIds: ['host-1', 'a', 'host-2'], mode: 'fail-fast' },
      });
    });

    const scopeIdFrames =
      (nodeType: string) =>
      (instance: number): StackFrame[] =>
        [
          {
            stepId: 'scope_owner',
            nestedScopes: [{ nodeId: 'enter_scope_owner', nodeType, scopeId: String(instance) }],
          },
        ];

    it.each([
      [
        'inside a foreach, only the current iteration',
        iterationFrames,
        iterationFrames(1),
        ['host-2'],
      ],
      ['outside a foreach, every iteration', iterationFrames, [], ['host-1', 'host-2']],
      [
        'inside a while, only the current iteration',
        scopeIdFrames('enter-while'),
        scopeIdFrames('enter-while')(1),
        ['host-2'],
      ],
      [
        'inside a retry, only the current attempt',
        scopeIdFrames('enter-retry'),
        scopeIdFrames('enter-retry')(1),
        ['host-2'],
      ],
    ])('awaits, from %s', async (_, framesFor, scopeStack, expectedIds) => {
      innerStepIdsByStep = { scan_host: [] };
      awaitScopeStack = scopeStack;
      addStartStepExecution('scan_host', 'host-1', ExecutionStatus.COMPLETED, framesFor(0));
      addStartStepExecution('scan_host', 'host-2', ExecutionStatus.COMPLETED, framesFor(1));
      executions = ['host-1', 'host-2'].map((id) => buildExecution(id, ExecutionStatus.RUNNING));

      await expect(start({ 'from-steps': ['scan_host'] })).resolves.toEqual({
        state: { executionIds: expectedIds, mode: 'fail-fast' },
      });
    });

    it('fails when the referenced steps resolve to more executions than the limit', async () => {
      innerStepIdsByStep = { scan_host: [] };
      const overLimit = WORKFLOW_AWAIT_EXECUTIONS_MAX_IDS + 1;
      for (let index = 0; index < overLimit; index++) {
        addStartStepExecution('scan_host', `host-${index}`);
      }

      await expect(start({ 'from-steps': ['scan_host'] })).rejects.toThrow(
        `"from-steps" can await at most ${WORKFLOW_AWAIT_EXECUTIONS_MAX_IDS} executions, got ${overLimit}.`
      );
    });

    it('fails when the referenced steps started no executions', async () => {
      innerStepIdsByStep = { maybe_enrich: ['enrich'] };
      addStartStepExecution('enrich', 'a', ExecutionStatus.FAILED);

      await expect(start({ 'from-steps': ['maybe_enrich'] })).rejects.toThrow(
        'Steps "maybe_enrich" started no workflow executions before this step. ' +
          'They must contain a workflow.executeAsync step that ran earlier on this path.'
      );
      expect(rehydrateStepOutputs).not.toHaveBeenCalled();
    });

    it.each([
      ['the await step itself', AWAIT_STEP_ID],
      ['a step that contains the await step', 'per_host'],
    ])('fails when from-steps references %s', async (_, stepName) => {
      innerStepIdsByStep = { [AWAIT_STEP_ID]: [], per_host: ['scan_host', AWAIT_STEP_ID] };
      addStartStepExecution('scan_host', 'a');

      await expect(start({ 'from-steps': [stepName] })).rejects.toThrow(
        `"from-steps" references steps that contain this step: "${stepName}". ` +
          'They have not finished when this step runs.'
      );
      expect(rehydrateStepOutputs).not.toHaveBeenCalled();
    });

    it('fails when a referenced step does not exist', async () => {
      innerStepIdsByStep = { run_agent: [] };

      await expect(start({ 'from-steps': ['run_agent', 'typo_step'] })).rejects.toThrow(
        '"from-steps" references unknown steps: "typo_step".'
      );
    });
  });
});
