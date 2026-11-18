/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';

import type {
  AwsOnboardingRunProgress,
  AwsOnboardingRunStackPhase,
} from '../../../common/types/rest_spec/aws_onboarding_run';
import type { AwsOnboardingStackStatus } from '../../../common/types/rest_spec/aws_onboarding';
import type { AwsOnboardingResolveOutput } from '../../../common/workflows/steps/resolve';
import type { AwsOnboardingCreateStackOutput } from '../../../common/workflows/steps/create_stack';
import type { AwsOnboardingUpdateStackOutput } from '../../../common/workflows/steps/update_stack';
import type { AwsOnboardingStackStatusOutput } from '../../../common/workflows/steps/stack_status';
import type { AwsOnboardingCreateConnectorOutput } from '../../../common/workflows/steps/create_connector';
import type { AwsOnboardingCreatePoliciesOutput } from '../../../common/workflows/steps/create_policies';
import type { AwsOnboardingHasDataOutput } from '../../../common/workflows/steps/has_data';
import { appContextService } from '../app_context';

import type { AwsCloudFormationClient } from './cloudformation_client';
import { awsOnboardingStackService } from './stacks';

type RunProgress = AwsOnboardingRunProgress;

/** Run endings that leave a row unfinished; that row is shown as failed. */
const FAILED_ENDINGS = new Set<ExecutionStatus>([
  ExecutionStatus.FAILED,
  ExecutionStatus.CANCELLED,
  ExecutionStatus.TIMED_OUT,
]);

/** Phases after which a row needs nothing more from the run. */
const SETTLED_PHASES = new Set(['complete', 'skipped', 'reused', 'partial']);

/**
 * The run is still moving: running a step, or in the engine's timer wait between polls.
 * A pause for the user is `WAITING_FOR_INPUT` and does not count.
 */
const isActive = (execution: WorkflowExecutionDto): boolean =>
  execution.status === ExecutionStatus.RUNNING || execution.status === ExecutionStatus.WAITING;

const newest = (runs: WorkflowStepExecutionDto[]): WorkflowStepExecutionDto | undefined =>
  runs.reduce<WorkflowStepExecutionDto | undefined>(
    (a, b) => (!a || b.globalExecutionIndex > a.globalExecutionIndex ? b : a),
    undefined
  );

/** The last execution of a step with an output, which differs from the first inside loops. */
export const lastStepExecution = (
  execution: WorkflowExecutionDto,
  stepId: string
): WorkflowStepExecutionDto | undefined =>
  newest(execution.stepExecutions.filter((s) => s.stepId === stepId && s.output != null));

export const lastOutput = <T>(execution: WorkflowExecutionDto, stepId: string): T | undefined =>
  lastStepExecution(execution, stepId)?.output as T | undefined;

/** A run creates a new identity's stack or updates a reused one's; the newer step decides. */
export const latestStackRun = (
  execution: WorkflowExecutionDto
): {
  action: 'create' | 'update';
  run?: WorkflowStepExecutionDto;
  output?: AwsOnboardingCreateStackOutput | AwsOnboardingUpdateStackOutput;
} => {
  const createStackRun = lastStepExecution(execution, 'create_stack');
  const updateStackRun = lastStepExecution(execution, 'update_stack');
  const action =
    updateStackRun &&
    (!createStackRun || updateStackRun.globalExecutionIndex > createStackRun.globalExecutionIndex)
      ? 'update'
      : 'create';
  const run = action === 'update' ? updateStackRun : createStackRun;
  return {
    action,
    run,
    output: run?.output as AwsOnboardingCreateStackOutput | AwsOnboardingUpdateStackOutput,
  };
};

const toStackPhase = (status: AwsOnboardingStackStatus): AwsOnboardingRunStackPhase => {
  if (status === 'complete' || status === 'in_progress') {
    return status;
  }
  return 'failed';
};

/**
 * The stack is read live from AWS only while its poll loop has not reached a terminal status,
 * because the step output is only as fresh as the engine's last poll; afterwards the step
 * outputs are final and no AWS call is made.
 */
const readStack = async (
  execution: WorkflowExecutionDto,
  resolve: AwsOnboardingResolveOutput | undefined,
  stackClient: Promise<AwsCloudFormationClient> | undefined
): Promise<RunProgress['stack']> => {
  if (resolve?.stack_action === 'none') {
    return { phase: 'skipped', resources: [] };
  }
  const { action, output } = latestStackRun(execution);
  if (!output) {
    return { phase: 'pending', resources: [] };
  }
  const identity = { stack_id: output.stack_id, stack_name: output.stack_name };
  if (action === 'update' && (output as AwsOnboardingUpdateStackOutput).no_changes) {
    return { phase: 'skipped', ...identity, resources: [] };
  }

  const polled = lastOutput<AwsOnboardingStackStatusOutput>(
    execution,
    action === 'update' ? 'stack_status_update' : 'stack_status'
  );
  if (polled && polled.status !== 'in_progress') {
    return {
      phase: toStackPhase(polled.status),
      ...identity,
      stack_status: polled.stack_status,
      reason: polled.reason,
      resources: [],
    };
  }

  if (isActive(execution)) {
    try {
      const client = await (stackClient ?? awsOnboardingStackService.createStatusClient());
      const live = await awsOnboardingStackService.statusWith(client, output.stack_id);
      return {
        phase: toStackPhase(live.status),
        ...identity,
        stack_status: live.stackStatus,
        reason: live.reason,
        resources: live.resources,
      };
    } catch (e) {
      appContextService
        .getLogger()
        .warn(`Could not read the AWS onboarding stack live: ${e.message}`);
    }
  }
  return {
    phase: 'in_progress',
    ...identity,
    stack_status: polled?.stack_status,
    reason: polled?.reason,
    resources: [],
  };
};

const readConnector = (
  execution: WorkflowExecutionDto,
  resolve: AwsOnboardingResolveOutput | undefined
): RunProgress['connector'] => {
  if (!resolve) {
    return { phase: 'pending' };
  }
  if (resolve.stack_action !== 'create') {
    return {
      phase: 'reused',
      name: resolve.identity_name,
      cloud_connector_id: resolve.cloud_connector_id,
    };
  }
  const created = lastOutput<AwsOnboardingCreateConnectorOutput>(execution, 'create_connector');
  return created
    ? {
        phase: 'complete',
        name: resolve.identity_name,
        cloud_connector_id: created.cloud_connector_id,
      }
    : { phase: 'pending' };
};

const readPolicies = (
  execution: WorkflowExecutionDto,
  resolve: AwsOnboardingResolveOutput | undefined,
  hasData: AwsOnboardingHasDataOutput | undefined
): RunProgress['policies'] => {
  const planned = (resolve?.policies ?? []).map(({ service, name }) => ({ service, name }));
  const run = newest(execution.stepExecutions.filter((s) => s.stepId === 'create_policies'));
  if (!run) {
    return { phase: 'pending', items: planned };
  }
  const output = run.output as AwsOnboardingCreatePoliciesOutput | undefined;
  if (!output) {
    return {
      phase: run.status === ExecutionStatus.FAILED ? 'failed' : 'in_progress',
      items: planned,
    };
  }
  const names = new Map(planned.map(({ service, name }) => [service, name]));
  return {
    phase: 'complete',
    items: output.policies.map(({ service, policy_id: policyId }) => ({
      service,
      name: names.get(service),
      policy_id: policyId,
      ...(hasData && { has_data: hasData.policies_with_data.includes(policyId) }),
    })),
  };
};

const readData = (
  execution: WorkflowExecutionDto,
  hasData: AwsOnboardingHasDataOutput | undefined
): RunProgress['ingest'] => {
  if (!hasData) {
    return { phase: 'pending' };
  }
  if (hasData.has_data) {
    return { phase: 'complete' };
  }
  if (execution.status === ExecutionStatus.COMPLETED) {
    return { phase: 'partial' };
  }
  // A check without a start time adds no wait time.
  const firstCheck = Math.min(
    ...execution.stepExecutions
      .filter((s) => s.stepId === 'has_data')
      .map((s) => Date.parse(s.startedAt))
      .filter((startedAt) => !Number.isNaN(startedAt))
  );
  const waited = Number.isFinite(firstCheck) ? Math.floor((Date.now() - firstCheck) / 1000) : 0;
  return { phase: 'waiting', waited_seconds: Math.max(0, waited) };
};

/**
 * A run that ended early leaves one row unfinished: the connector when its step was the last
 * one started and did not finish, otherwise the first row that is neither done nor failed.
 */
const failUnfinishedRow = (
  execution: WorkflowExecutionDto,
  progress: RunProgress,
  error: string | undefined
): void => {
  const lastStarted = newest(execution.stepExecutions);
  if (
    lastStarted?.output == null &&
    (lastStarted?.stepId === 'create_connector' || lastStarted?.stepId === 'update_connector')
  ) {
    progress.connector.phase = 'failed';
    return;
  }
  const { stack, connector, policies, ingest } = progress;
  const unfinished = [stack, connector, policies, ingest].find(
    ({ phase }) => !SETTLED_PHASES.has(phase)
  );
  if (!unfinished || unfinished.phase === 'failed') {
    return;
  }
  unfinished.phase = 'failed';
  if (unfinished === stack) {
    stack.reason ??= error;
  }
};

/** Derives the progress of an onboarding run, from its identity stack to the data arriving. */
export const readAwsOnboardingRunProgress = async (
  execution: WorkflowExecutionDto,
  deps: { stackClient?: Promise<AwsCloudFormationClient> } = {}
): Promise<AwsOnboardingRunProgress> => {
  const resolve = lastOutput<AwsOnboardingResolveOutput>(execution, 'resolve');
  const hasData = lastOutput<AwsOnboardingHasDataOutput>(execution, 'has_data');
  const dashboardPath = lastOutput<{ dashboard_path?: string }>(execution, 'done')?.dashboard_path;
  const error = execution.error?.message;

  const progress: RunProgress = {
    status: execution.status,
    stack: await readStack(execution, resolve, deps.stackClient),
    connector: readConnector(execution, resolve),
    policies: readPolicies(execution, resolve, hasData),
    ingest: readData(execution, hasData),
    ...(dashboardPath && { dashboard_path: dashboardPath }),
    ...(error && { error }),
  };
  if (FAILED_ENDINGS.has(execution.status)) {
    failUnfinishedRow(execution, progress, error);
  }
  return progress;
};
