/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  ExecutionStatus,
  WorkflowsManagementOperationPrivileges,
  toWorkflowExecutionEngineModel,
} from '@kbn/workflows';
import {
  CASES_WORKFLOW_EXECUTION_METADATA_SCHEMA_VERSION,
  CASES_WORKFLOW_EXECUTION_SOURCE,
} from '../../../common/constants';
import { CasesWorkflowExecutionMetadataSchema } from '../../../common/types/api/workflow/v1';
import type { CaseTask, CaseTaskWorkflowRun } from '../../../common/types/domain/task/v1';
import { UserActionTypes } from '../../../common/types/domain/user_action/action/v1';
import type { CasesClientArgs } from '../types';

type WorkflowsManagement = NonNullable<CasesClientArgs['workflowsManagement']>;

const FAILED_STATUSES = new Set<string>([
  ExecutionStatus.FAILED,
  ExecutionStatus.CANCELLED,
  ExecutionStatus.TIMED_OUT,
  ExecutionStatus.SKIPPED,
]);

export const isTaskFinished = (status: CaseTask['status']) =>
  status === 'completed' || status === 'cancelled';

/** Refuses before anything runs, with the same messages the case run-workflow route uses. */
export const getTaskWorkflowManagement = async (
  clientArgs: CasesClientArgs
): Promise<WorkflowsManagement> => {
  const { workflowsManagement, services } = clientArgs;
  if (!workflowsManagement) {
    throw Boom.notFound('Running workflows from cases is not enabled.');
  }
  if (!workflowsManagement.isWorkflowsAvailable) {
    throw Boom.forbidden('Workflows are not available.');
  }
  if (!(await services.licensingService.isAtLeastEnterprise())) {
    throw Boom.forbidden('Workflows require an active Enterprise license.');
  }
  return workflowsManagement;
};

const hasWorkflowPrivileges = async (
  clientArgs: CasesClientArgs,
  privileges: readonly string[]
): Promise<boolean> => {
  const authz = clientArgs.securityStartPlugin?.authz;
  if (!authz || !authz.mode.useRbacForRequest(clientArgs.request)) {
    return true;
  }
  const { hasAllRequested } = await authz.checkPrivilegesDynamicallyWithRequest(
    clientArgs.request
  )({ kibana: privileges.map((privilege) => authz.actions.api.get(privilege)) });
  return hasAllRequested;
};

const RUN_PRIVILEGES = [
  ...WorkflowsManagementOperationPrivileges.execute,
  ...WorkflowsManagementOperationPrivileges.read,
];
const READ_PRIVILEGES = [...WorkflowsManagementOperationPrivileges.read];

/**
 * The workflows privileges, checked in the client so every caller is covered (the routes, the
 * agent tools): `runWorkflow` itself only checks the workflow's own access list.
 */
export const ensureCanRunTaskWorkflows = async (clientArgs: CasesClientArgs) => {
  if (!(await hasWorkflowPrivileges(clientArgs, RUN_PRIVILEGES))) {
    throw Boom.forbidden(
      "Running a task's workflow needs the Workflows execute and read privileges."
    );
  }
};

export const ensureCanReadTaskWorkflows = async (clientArgs: CasesClientArgs) => {
  if (!(await hasWorkflowPrivileges(clientArgs, READ_PRIVILEGES))) {
    throw Boom.forbidden("Reading a task's workflow run needs the Workflows read privilege.");
  }
};

export const ensureTaskCanRunWorkflow = (task: CaseTask): string => {
  if (!task.workflow_id) {
    throw Boom.badRequest(`Task "${task.title}" has no workflow to run.`);
  }
  if (isTaskFinished(task.status)) {
    throw Boom.badRequest(`Task "${task.title}" is already finished.`);
  }
  if (task.workflow_run?.status === 'running') {
    throw Boom.conflict(`The workflow of task "${task.title}" is already running.`);
  }
  return task.workflow_id;
};

/**
 * Starts the task's workflow as the caller. The event carries the case fields the
 * run-workflows-from-cases plan locked (`caseId, owner, title, severity, status, tags`), plus
 * `caseIds` and the task so workflows written for case runs work unchanged.
 */
export const startTaskWorkflow = async ({
  clientArgs,
  management,
  task,
  workflowId,
  theCase,
}: {
  clientArgs: CasesClientArgs;
  management: WorkflowsManagement;
  task: CaseTask;
  workflowId: string;
  theCase: { title: string; severity: string; status: string; tags: string[] };
}): Promise<CaseTaskWorkflowRun> => {
  const { spaceId, request } = clientArgs;
  const workflow = await management.getWorkflow(workflowId, spaceId, request);
  if (!workflow) {
    throw Boom.notFound(`Workflow "${workflowId}" was not found.`);
  }
  if (!workflow.valid) {
    throw Boom.badRequest('Workflow is not valid.');
  }
  if (!workflow.enabled) {
    throw Boom.badRequest('Workflow is disabled. Enable it to run it.');
  }

  // Same metadata shape as a run from the case header, so the workflows UI lists task runs with
  // the case's other runs.
  const metadata = CasesWorkflowExecutionMetadataSchema.parse({
    schemaVersion: CASES_WORKFLOW_EXECUTION_METADATA_SCHEMA_VERSION,
    source: CASES_WORKFLOW_EXECUTION_SOURCE,
    caseIds: [task.case_id],
  });

  const executionId = await management.runWorkflow(
    toWorkflowExecutionEngineModel(workflow),
    spaceId,
    {
      event: {
        caseId: task.case_id,
        caseIds: [task.case_id],
        owner: task.owner,
        title: theCase.title,
        severity: theCase.severity,
        status: theCase.status,
        tags: theCase.tags,
        taskId: task.id,
        taskTitle: task.title,
      },
    },
    request,
    undefined,
    metadata,
    true
  );

  return {
    execution_id: executionId,
    status: 'running',
    started_at: new Date().toISOString(),
    finished_at: null,
    error: null,
  };
};

/** Null while the run is still going (or can't be read yet). */
export const readTaskWorkflowOutcome = async ({
  clientArgs,
  management,
  run,
}: {
  clientArgs: CasesClientArgs;
  management: WorkflowsManagement;
  run: CaseTaskWorkflowRun;
}): Promise<CaseTaskWorkflowRun | null> => {
  const execution = await management.getWorkflowExecution(run.execution_id, clientArgs.spaceId, {
    request: clientArgs.request,
    omitStepExecutions: true,
  });
  if (!execution) {
    return null;
  }
  if (execution.status === ExecutionStatus.COMPLETED) {
    return {
      ...run,
      status: 'succeeded',
      finished_at: execution.finishedAt ?? new Date().toISOString(),
      error: null,
    };
  }
  if (FAILED_STATUSES.has(execution.status)) {
    return {
      ...run,
      status: 'failed',
      finished_at: execution.finishedAt ?? new Date().toISOString(),
      error: execution.error?.message ?? `The workflow ended as ${execution.status}.`,
    };
  }
  return null;
};

const recordRunChange = (
  clientArgs: CasesClientArgs,
  before: CaseTask,
  after: CaseTask,
  fields: Array<'status' | 'workflow_run'>
) =>
  clientArgs.services.userActionService.creator.createUserAction({
    userAction: {
      type: UserActionTypes.update_task,
      caseId: before.case_id,
      owner: before.owner,
      user: clientArgs.user,
      payload: {
        task_id: before.id,
        task_title: after.title,
        changed_fields: fields.map((field) => ({
          field,
          old_value: before[field] ?? null,
          new_value: after[field] ?? null,
        })),
      },
    },
  });

/** Records a run that just started on its task: in progress, with the execution id. */
export const recordTaskWorkflowStarted = async (
  clientArgs: CasesClientArgs,
  task: CaseTask,
  run: CaseTaskWorkflowRun
): Promise<CaseTask> => {
  const updated = await clientArgs.services.taskService.updateTask({
    taskId: task.id,
    version: task.version,
    user: clientArgs.user,
    workflow_run: run,
    ...(task.status === 'open' ? { status: 'in_progress' as const } : {}),
    refresh: 'wait_for',
  });
  await recordRunChange(clientArgs, task, updated, ['workflow_run']);
  return updated;
};

/**
 * Applies a finished run to its task: success completes it, failure records the error and leaves
 * it open. Returns the task unchanged while the run is still going. The caller has already
 * authorized the task's case.
 */
export const settleTaskWorkflowRun = async ({
  clientArgs,
  management,
  task,
}: {
  clientArgs: CasesClientArgs;
  management: WorkflowsManagement;
  task: CaseTask;
}): Promise<CaseTask> => {
  if (task.workflow_run?.status !== 'running') {
    return task;
  }
  const outcome = await readTaskWorkflowOutcome({ clientArgs, management, run: task.workflow_run });
  if (!outcome) {
    return task;
  }
  const succeeded = outcome.status === 'succeeded' && !isTaskFinished(task.status);
  const updated = await clientArgs.services.taskService.updateTask({
    taskId: task.id,
    version: task.version,
    user: clientArgs.user,
    workflow_run: outcome,
    ...(succeeded ? { status: 'completed' as const } : {}),
    refresh: 'wait_for',
  });
  await recordRunChange(
    clientArgs,
    task,
    updated,
    succeeded ? ['workflow_run', 'status'] : ['workflow_run']
  );
  return updated;
};

/**
 * Best effort, for reads and the close check: settles the runs that ended since anyone last
 * looked, so closing a case or an agent reading its tasks sees the outcome without a browser
 * polling. Without Workflows or the read privilege the tasks are returned as they are.
 */
export const settleRunningTaskWorkflows = async (
  clientArgs: CasesClientArgs,
  tasks: CaseTask[]
): Promise<CaseTask[]> => {
  if (!tasks.some((task) => task.workflow_run?.status === 'running')) {
    return tasks;
  }
  const { workflowsManagement } = clientArgs;
  if (
    !workflowsManagement?.isWorkflowsAvailable ||
    !(await hasWorkflowPrivileges(clientArgs, READ_PRIVILEGES))
  ) {
    return tasks;
  }
  return Promise.all(
    tasks.map(async (task) => {
      try {
        return await settleTaskWorkflowRun({ clientArgs, management: workflowsManagement, task });
      } catch (error) {
        clientArgs.logger.debug(
          `Could not read the workflow run of task ${task.id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return task;
      }
    })
  );
};
