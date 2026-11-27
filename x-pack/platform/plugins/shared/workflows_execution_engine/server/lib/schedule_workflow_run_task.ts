/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { TaskInstance, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { publishFinishedWorkflowExecution } from '../topics/publish_finished_workflow_execution';
import type { StartWorkflowExecutionParams } from '../workflow_task_manager/types';

export interface ScheduleWorkflowRunTaskDeps {
  taskManager: TaskManagerStartContract;
  workflowExecutionRepository: WorkflowExecutionRepository;
  logger: Logger;
}

export type WorkflowRunTaskInstance = TaskInstance & {
  id: string;
  params: StartWorkflowExecutionParams;
};

// Task Manager rethrows a per-item saved object error, which is a plain object, not an Error.
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  return String(error);
};

// A persisted execution with no task would otherwise stay pending forever.
const markExecutionsFailed = async (
  { workflowExecutionRepository, logger }: ScheduleWorkflowRunTaskDeps,
  executions: Array<{ id: string; spaceId: string }>,
  message: string
): Promise<void> => {
  if (executions.length === 0) {
    return;
  }
  const finishedAt = new Date().toISOString();
  const error = { type: 'TaskScheduleError', message };
  const existing = await Promise.all(
    executions.map(async ({ id, spaceId }) => {
      try {
        return await workflowExecutionRepository.getWorkflowExecutionById(id, spaceId);
      } catch (readError) {
        logger.debug(
          `Could not read workflow execution ${id} before marking it FAILED: ${getErrorMessage(
            readError
          )}`
        );
        return null;
      }
    })
  );
  try {
    await workflowExecutionRepository.bulkUpdateWorkflowExecutions(
      executions.map(({ id }) => ({
        id,
        status: ExecutionStatus.FAILED,
        error,
        finishedAt,
      }))
    );
  } catch (updateError) {
    logger.error(
      `Failed to mark workflow executions [${executions
        .map(({ id }) => id)
        .join(', ')}] as FAILED after task schedule error "${message}": ${getErrorMessage(
        updateError
      )}`
    );
    return;
  }
  await Promise.all(
    existing.map((execution) =>
      publishFinishedWorkflowExecution(execution, {
        status: ExecutionStatus.FAILED,
        error,
        finishedAt,
      })
    )
  );
};

/** Schedules one workflow run task; if scheduling throws, marks its execution FAILED and rethrows. */
export const scheduleRunTaskOrMarkFailed = async (
  deps: ScheduleWorkflowRunTaskDeps,
  taskInstance: WorkflowRunTaskInstance,
  request: KibanaRequest
): Promise<void> => {
  try {
    await deps.taskManager.schedule(taskInstance, { request, cloneApiKey: true });
  } catch (error) {
    await markExecutionsFailed(
      deps,
      [{ id: taskInstance.params.workflowRunId, spaceId: taskInstance.params.spaceId }],
      getErrorMessage(error)
    );
    throw error;
  }
};

/** Bulk-schedules workflow run tasks and marks FAILED the executions whose task was not saved. */
export const bulkScheduleRunTasksOrMarkFailed = async (
  deps: ScheduleWorkflowRunTaskDeps,
  tasks: WorkflowRunTaskInstance[],
  request: KibanaRequest
): Promise<{ failedExecutionIds: Set<string>; message: string }> => {
  const { taskManager } = deps;
  let unscheduled: WorkflowRunTaskInstance[];
  let message: string;
  // bulkSchedule can save some tasks and then throw, or skip a task without throwing.
  try {
    const scheduled = await taskManager.bulkSchedule(tasks, { request, cloneApiKey: true });
    const scheduledIds = new Set(scheduled.map(({ id }) => id));
    unscheduled = tasks.filter(({ id }) => !scheduledIds.has(id));
    message = 'Task Manager did not schedule the workflow task.';
  } catch (error) {
    const found = await taskManager.bulkGet(tasks.map(({ id }) => id)).catch(() => []);
    unscheduled = tasks.filter((_task, index) => found[index]?.tag !== 'ok');
    message = getErrorMessage(error);
  }
  const failedExecutions = unscheduled.map(({ params }) => ({
    id: params.workflowRunId,
    spaceId: params.spaceId,
  }));
  await markExecutionsFailed(deps, failedExecutions, message);
  return { failedExecutionIds: new Set(failedExecutions.map(({ id }) => id)), message };
};
