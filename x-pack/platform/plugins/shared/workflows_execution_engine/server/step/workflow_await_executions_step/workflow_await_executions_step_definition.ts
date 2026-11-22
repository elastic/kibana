/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AwaitedExecutionResult,
  type EsWorkflowExecution,
  ExecutionStatus,
  isTerminalStatus,
  StepCategory,
  WORKFLOW_AWAIT_EXECUTIONS_MAX_IDS,
  WORKFLOW_EXECUTE_ASYNC_STEP_TYPE,
  WorkflowAwaitExecutionsModeSchema,
  WorkflowAwaitExecutionsStepInputSchema,
  type WorkflowAwaitExecutionsStepOutput,
  WorkflowAwaitExecutionsStepOutputSchema,
} from '@kbn/workflows';
import { ExecutionError } from '@kbn/workflows/server';
import {
  createPollServerStepDefinition,
  type DurablePhaseResult,
  type PollCeilings,
  type PollPolicy,
  type ServerPollStepDefinition,
} from '@kbn/workflows-extensions/server';
import { lazySchema, z } from '@kbn/zod/v4';
import type { StepExecutionRepository } from '../../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../../repositories/workflow_execution_repository';
import { hasExecutionChain } from '../../utils';
import {
  areParallelBranchesCompatible,
  getScopeInstances,
} from '../../workflow_context_manager/parallel_branch_scope';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { StepIoService } from '../../workflow_context_manager/step_io_service';
import type { WorkflowExecutionState } from '../../workflow_context_manager/workflow_execution_state';
import type { WorkflowRuntimeGraph } from '../../workflow_context_manager/workflow_runtime_graph';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import {
  buildChildFailureError,
  readChildExecutionOutput,
} from '../workflow_execute_step/child_execution_result';

/** Polls after 1 s, then backs off by 1.5x up to one poll every 15 s. */
export const AWAIT_EXECUTIONS_POLL_POLICY: PollPolicy = {
  strategy: 'exponential',
  initialMs: 1_000,
  multiplier: 1.5,
  maxMs: 15_000,
};

/**
 * Caps an await at about 24 hours (5,760 polls at the 15 s policy maximum), even when the step
 * `timeout` is longer; the step description documents this limit.
 */
export const AWAIT_EXECUTIONS_POLL_CEILINGS: PollCeilings = {
  maxAttempts: 5_760,
  maxWaitMs: 60_000,
};

const AwaitExecutionsStateSchema = lazySchema(() =>
  z.object({
    executionIds: z.array(z.string()),
    mode: WorkflowAwaitExecutionsModeSchema,
  })
);
type AwaitExecutionsState = z.infer<typeof AwaitExecutionsStateSchema>;

type AwaitExecutionsPhaseResult = DurablePhaseResult<
  typeof WorkflowAwaitExecutionsStepOutputSchema,
  typeof AwaitExecutionsStateSchema
>;

export interface AwaitExecutionsStepDependencies {
  stepExecutionRuntime: Pick<
    StepExecutionRuntime,
    'workflowExecution' | 'stepExecutionId' | 'rehydrateStepOutputs' | 'releaseReadOutputPins'
  >;
  workflowExecutionRepository: Pick<
    WorkflowExecutionRepository,
    'getWorkflowExecutionStatusesByIds' | 'getWorkflowExecutionsByIds'
  >;
  stepExecutionRepository: StepExecutionRepository;
  workflowGraph: Pick<WorkflowRuntimeGraph, 'hasStep' | 'getInnerStepIds'>;
  workflowExecutionState: Pick<WorkflowExecutionState, 'getAllStepExecutions' | 'getStepExecution'>;
  stepIoService: Pick<StepIoService, 'getStepOutput'>;
  spaceId: string;
  workflowLogger: IWorkflowEventLogger;
}

/**
 * Builds the durable poll definition behind `workflow.awaitExecutions`: `start` resolves the
 * awaited executions once and checks them, and each `poll` re-reads them until they finish.
 */
export const createAwaitExecutionsStepDefinition = (
  dependencies: AwaitExecutionsStepDependencies
): ServerPollStepDefinition<
  typeof WorkflowAwaitExecutionsStepInputSchema,
  typeof WorkflowAwaitExecutionsStepOutputSchema,
  z.ZodObject,
  typeof AwaitExecutionsStateSchema
> =>
  createPollServerStepDefinition({
    id: 'workflow.awaitExecutions',
    label: 'Await Workflow Executions',
    description: 'Wait for executions started by workflow.executeAsync to finish.',
    category: StepCategory.FlowControl,
    inputSchema: WorkflowAwaitExecutionsStepInputSchema,
    outputSchema: WorkflowAwaitExecutionsStepOutputSchema,
    stateSchema: AwaitExecutionsStateSchema,
    policy: AWAIT_EXECUTIONS_POLL_POLICY,
    ceilings: AWAIT_EXECUTIONS_POLL_CEILINGS,
    start: async ({ input, stepId }) => {
      const { 'from-steps': fromSteps, 'execution-ids': rawExecutionIds, mode } = input;
      const executionIds = fromSteps
        ? await resolveExecutionIdsFromSteps(dependencies, fromSteps, stepId)
        : normalizeExecutionIds(rawExecutionIds, 'execution-ids');
      const statuses = await readStartedExecutionStatuses(dependencies, executionIds);
      return checkExecutions(dependencies, { executionIds, mode: mode ?? 'fail-fast' }, statuses);
    },
    poll: async ({ state }) => {
      if (!state) {
        throw new Error(
          'workflow.awaitExecutions polled before resolving the executions to await.'
        );
      }
      const statuses = await readExecutionStatuses(dependencies, state.executionIds);
      return checkExecutions(dependencies, state, statuses);
    },
  });

const checkExecutions = async (
  dependencies: AwaitExecutionsStepDependencies,
  state: AwaitExecutionsState,
  statuses: Map<string, ExecutionStatus>
): Promise<AwaitExecutionsPhaseResult> => {
  const { executionIds, mode } = state;
  const statusOf = (id: string): ExecutionStatus => statuses.get(id) as ExecutionStatus;

  const firstUnsuccessfulId = executionIds.find(
    (id) => isTerminalStatus(statusOf(id)) && statusOf(id) !== ExecutionStatus.COMPLETED
  );

  if (mode === 'fail-fast' && firstUnsuccessfulId) {
    const output = await buildOutput(dependencies, executionIds);
    const failedResult = output.results.find(
      ({ executionId }) => executionId === firstUnsuccessfulId
    );
    return {
      output,
      error: new ExecutionError({
        type: 'AwaitedExecutionFailed',
        message: `Awaited execution ${firstUnsuccessfulId} of workflow "${
          failedResult?.workflowId
        }" ended with status ${statusOf(firstUnsuccessfulId)}${
          failedResult?.error ? `: ${failedResult.error.message}` : ''
        }`,
      }),
    };
  }

  if (executionIds.every((id) => isTerminalStatus(statusOf(id)))) {
    return { output: await buildOutput(dependencies, executionIds) };
  }

  return { state };
};

const throwExecutionsNotFound = (missingIds: string[]): never => {
  throw new Error(
    `Workflow execution not found: ${missingIds.join(
      ', '
    )}. Only executions started by this workflow run can be awaited.`
  );
};

/**
 * Checks once, when the step starts, that every awaited execution exists and was started by this
 * run (directly or through a descendant), and returns their statuses. Executions started by
 * anything else are reported as missing, so a workflow cannot read the results of unrelated
 * executions in the space.
 */
const readStartedExecutionStatuses = async (
  { workflowExecutionRepository, spaceId, stepExecutionRuntime }: AwaitExecutionsStepDependencies,
  executionIds: string[]
): Promise<Map<string, ExecutionStatus>> => {
  const currentExecutionId = stepExecutionRuntime.workflowExecution.id;
  const executions = await workflowExecutionRepository.getWorkflowExecutionsByIds(
    executionIds,
    spaceId
  );

  const missingIds = executionIds.filter((id) => {
    const execution = executions.get(id);
    return !execution || !isStartedByExecution(execution, currentExecutionId);
  });
  if (missingIds.length > 0) {
    throwExecutionsNotFound(missingIds);
  }

  return new Map([...executions].map(([id, { status }]) => [id, status]));
};

/** Reads only the statuses on each poll; the lineage of the frozen IDs was checked at start. */
const readExecutionStatuses = async (
  { workflowExecutionRepository, spaceId }: AwaitExecutionsStepDependencies,
  executionIds: string[]
): Promise<Map<string, ExecutionStatus>> => {
  const statuses = await workflowExecutionRepository.getWorkflowExecutionStatusesByIds(
    executionIds,
    spaceId
  );
  const missingIds = executionIds.filter((id) => !statuses.has(id));
  if (missingIds.length > 0) {
    throwExecutionsNotFound(missingIds);
  }
  return statuses;
};

/** Loads the awaited executions once, when the step finishes, to build each result. */
const buildOutput = async (
  dependencies: AwaitExecutionsStepDependencies,
  executionIds: string[]
): Promise<WorkflowAwaitExecutionsStepOutput> => {
  const { workflowExecutionRepository, spaceId } = dependencies;
  const executions = await workflowExecutionRepository.getWorkflowExecutionsByIds(
    executionIds,
    spaceId
  );
  const missingIds = executionIds.filter((id) => !executions.has(id));
  if (missingIds.length > 0) {
    throwExecutionsNotFound(missingIds);
  }

  const results = await Promise.all(
    executionIds.map((id) => buildResult(dependencies, executions.get(id) as EsWorkflowExecution))
  );
  return { results };
};

const buildResult = async (
  { stepExecutionRepository, workflowLogger }: AwaitExecutionsStepDependencies,
  execution: EsWorkflowExecution
): Promise<AwaitedExecutionResult> => {
  const result: AwaitedExecutionResult = {
    executionId: execution.id,
    workflowId: execution.workflowId,
    status: execution.status,
    ...(execution.startedAt ? { startedAt: execution.startedAt } : {}),
    ...(execution.finishedAt ? { finishedAt: execution.finishedAt } : {}),
  };

  if (!isTerminalStatus(execution.status)) {
    return result;
  }

  if (execution.status === ExecutionStatus.COMPLETED) {
    const output = await readChildExecutionOutput(execution, stepExecutionRepository);
    return output === undefined ? result : { ...result, output };
  }

  const { type, message } = await buildChildFailureError(
    execution,
    stepExecutionRepository,
    workflowLogger
  );
  return { ...result, error: { type, message } };
};

/**
 * Collects the executions started by every successful `workflow.executeAsync` run of the
 * referenced steps or of any step nested inside them, in the order they ran.
 */
const resolveExecutionIdsFromSteps = async (
  {
    workflowGraph,
    workflowExecutionState,
    stepIoService,
    stepExecutionRuntime,
  }: AwaitExecutionsStepDependencies,
  stepNames: string[],
  awaitStepId: string
): Promise<string[]> => {
  const unknownSteps = stepNames.filter((stepName) => !workflowGraph.hasStep(stepName));
  if (unknownSteps.length > 0) {
    throw new Error(`"from-steps" references unknown steps: ${formatStepNames(unknownSteps)}.`);
  }

  const enclosingSteps = stepNames.filter(
    (stepName) =>
      stepName === awaitStepId || workflowGraph.getInnerStepIds(stepName).has(awaitStepId)
  );
  if (enclosingSteps.length > 0) {
    throw new Error(
      `"from-steps" references steps that contain this step: ${formatStepNames(
        enclosingSteps
      )}. They have not finished when this step runs.`
    );
  }

  const coveredStepIds = new Set(
    stepNames.flatMap((stepName) => [stepName, ...workflowGraph.getInnerStepIds(stepName)])
  );
  const awaitScopes = getScopeInstances(
    workflowExecutionState.getStepExecution(stepExecutionRuntime.stepExecutionId)?.scopeStack ?? []
  );
  const startStepExecutionIds = workflowExecutionState
    .getAllStepExecutions()
    .filter(
      ({ stepId, stepType, status, scopeStack }) =>
        stepType === WORKFLOW_EXECUTE_ASYNC_STEP_TYPE &&
        status === ExecutionStatus.COMPLETED &&
        coveredStepIds.has(stepId) &&
        areParallelBranchesCompatible(awaitScopes, getScopeInstances(scopeStack ?? []))
    )
    .sort((left, right) => left.globalExecutionIndex - right.globalExecutionIndex)
    .map(({ id }) => id);

  if (startStepExecutionIds.length === 0) {
    throw new Error(
      `Steps ${formatStepNames(stepNames)} started no workflow executions before this step. ` +
        'They must contain a workflow.executeAsync step that ran earlier on this path.'
    );
  }

  await stepExecutionRuntime.rehydrateStepOutputs(startStepExecutionIds);
  try {
    return normalizeExecutionIds(
      startStepExecutionIds.map((id) => stepIoService.getStepOutput(id)),
      'from-steps'
    );
  } finally {
    stepExecutionRuntime.releaseReadOutputPins();
  }
};

const formatStepNames = (stepNames: string[]): string =>
  stepNames.map((stepName) => `"${stepName}"`).join(', ');

/** True when `ancestorExecutionId` started the execution, directly or through a descendant. */
const isStartedByExecution = (
  execution: EsWorkflowExecution,
  ancestorExecutionId: string
): boolean => {
  const { context } = execution;
  if (context?.parentWorkflowExecutionId === ancestorExecutionId) {
    return true;
  }
  return (
    hasExecutionChain(context) &&
    context.executionChain.some(({ executionId }) => executionId === ancestorExecutionId)
  );
};

const describeValueKind = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'no value';
  }
  if (typeof value === 'string') {
    return value.trim().length === 0 ? 'an empty string' : 'a string';
  }
  if (Array.isArray(value)) {
    return 'a list';
  }
  return typeof value === 'object' ? 'an object' : `a ${typeof value}`;
};

/**
 * Describes an invalid execution ID item by its kind only. Its contents are never echoed, since
 * the error is persisted and a template can resolve to a whole step output.
 */
const describeInvalidItem = (item: unknown): string => {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return describeValueKind(item);
  }
  return 'executionId' in item
    ? `an object whose executionId is ${describeValueKind(item.executionId)}`
    : 'an object without an executionId field';
};

/**
 * Accepts a single ID, a list of IDs, or a list of `workflow.executeAsync` outputs, and returns
 * the unique IDs in their original order.
 */
const normalizeExecutionIds = (rendered: unknown, field: string): string[] => {
  const items = Array.isArray(rendered) ? rendered : [rendered];
  const ids = items.map((item, index) => {
    const id =
      typeof item === 'object' && item !== null && 'executionId' in item
        ? (item as { executionId: unknown }).executionId
        : item;
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error(
        `"${field}" item ${index} resolved to ${describeInvalidItem(
          item
        )}; expected a non-empty execution ID or a workflow.executeAsync output.`
      );
    }
    return id.trim();
  });

  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) {
    throw new Error(`"${field}" resolved to an empty list.`);
  }
  if (uniqueIds.length > WORKFLOW_AWAIT_EXECUTIONS_MAX_IDS) {
    throw new Error(
      `"${field}" can await at most ${WORKFLOW_AWAIT_EXECUTIONS_MAX_IDS} executions, got ${uniqueIds.length}.`
    );
  }
  return uniqueIds;
};
