/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import {
  CASE_TASK_SAVED_OBJECT,
  MAX_COMMENTS_PER_TASK,
  MAX_TASKS_PER_CASE,
} from '../../../common/constants';
import type {
  TaskCommentCreateRequest,
  TaskCommentsResponse,
  TaskCreateRequest,
  TaskPatchRequest,
  TasksFindRequest,
  TasksFindResponse,
  TasksResponse,
} from '../../../common/types/api/task/v1';
import {
  TaskCommentCreateRequestSchema,
  TaskCreateRequestSchema,
  TaskPatchRequestSchema,
  TasksFindRequestSchema,
} from '../../../common/types/api/task/v1';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import type { CaseTaskComment } from '../../../common/types/domain/task_comment/v1';
import { UserActionTypes } from '../../../common/types/domain/user_action/action/v1';
import { Operations, ReadOperations, WriteOperations } from '../../authorization';
import { createCaseEntity } from '../../authorization/utils';
import { LICENSING_CASE_TASKS_FEATURE } from '../../common/constants';
import { createCaseError, isSOError } from '../../common/error';
import { decodeWithExcessOrThrowZod } from '../../common/runtime_types';
import type { CasesClientArgs } from '../types';
import { applyTaskListToCase, ensureTaskCapacity } from './apply_task_list';
import {
  ensureCanReadTaskWorkflows,
  ensureCanRunTaskWorkflows,
  ensureTaskCanRunWorkflow,
  getTaskWorkflowManagement,
  recordTaskWorkflowStarted,
  settleRunningTaskWorkflows,
  settleTaskWorkflowRun,
  startTaskWorkflow,
} from './task_workflow';

const WORKFLOW_POLL_INTERVAL_MS = 2000;
const DEFAULT_WORKFLOW_WAIT_MS = 20_000;

// Bounds the hidden-case lookup in `find`; restricted cases are expected to be few per space.
const MAX_HIDDEN_CASES_PER_FIND = 1000;

export interface TasksSubClient {
  create(caseId: string, params: TaskCreateRequest): Promise<CaseTask>;
  get(taskId: string): Promise<CaseTask>;
  getByCase(caseId: string): Promise<TasksResponse>;
  /** Cross-case search, e.g. the tasks assigned to the current user. */
  find(params: TasksFindRequest): Promise<TasksFindResponse>;
  update(taskId: string, params: TaskPatchRequest): Promise<CaseTask>;
  delete(taskId: string): Promise<void>;
  reorder(caseId: string, orderedTaskIds: string[]): Promise<void>;
  /** Adds every task of a task list to the case. */
  applyTemplate(caseId: string, templateId: string): Promise<CaseTask[]>;
  /** Task threads stay apart from the case activity; they never write case user actions. */
  getComments(taskId: string): Promise<TaskCommentsResponse>;
  addComment(taskId: string, params: TaskCommentCreateRequest): Promise<CaseTaskComment>;
  deleteComment(taskId: string, commentId: string): Promise<void>;
  /** Starts the task's workflow as the caller; the task completes only when the run succeeds. */
  runWorkflow(taskId: string): Promise<CaseTask>;
  /** Reads the run's outcome: success completes the task, failure records the error. */
  refreshWorkflowRun(taskId: string): Promise<CaseTask>;
  /** Runs the workflow and waits up to `timeoutMs` (default 20 s) for its outcome. */
  runWorkflowAndWait(taskId: string, options?: { timeoutMs?: number }): Promise<CaseTask>;
}

const asArray = <T>(value: T | T[] | undefined): T[] | undefined =>
  value === undefined ? undefined : Array.isArray(value) ? value : [value];

export const createTasksSubClient = (clientArgs: CasesClientArgs): TasksSubClient => {
  const {
    services: {
      caseService,
      taskService,
      taskTemplateService,
      taskCommentService,
      userActionService,
      licensingService,
    },
    user,
    authorization,
    logger,
    config,
  } = clientArgs;

  const ensureEnabled = async () => {
    if (!config.tasks.enabled) {
      throw Boom.notFound('Case tasks are not enabled');
    }
    if (!(await licensingService.isAtLeastPlatinum())) {
      throw Boom.forbidden(
        'In order to use case tasks, you must be subscribed to an Elastic Platinum license'
      );
    }
    licensingService.notifyUsage(LICENSING_CASE_TASKS_FEATURE);
  };

  // Tasks are authorized through their parent case so a restricted case's tasks stay hidden
  // from everyone the case is hidden from.
  const getAuthorizedCase = async (caseId: string, operation: ReadOperations | WriteOperations) => {
    const theCase = await caseService.getCase({ id: caseId });
    await authorization.ensureAuthorized({
      operation: Operations[operation],
      entities: [createCaseEntity(theCase)],
    });
    return theCase;
  };

  const getAuthorizedTask = async (taskId: string, operation: ReadOperations | WriteOperations) => {
    const task = await taskService.getTask(taskId);
    try {
      await getAuthorizedCase(task.case_id, operation);
    } catch (error) {
      // A task of a hidden case answers exactly like a missing task, so the response confirms
      // neither the task nor its restricted case.
      if (Boom.isBoom(error) && error.output.statusCode === 404) {
        const notFound = SavedObjectsErrorHelpers.createGenericNotFoundError(
          CASE_TASK_SAVED_OBJECT,
          taskId
        );
        throw createCaseError({
          message: `Failed to get task ${taskId}: ${notFound}`,
          error: notFound,
          logger,
        });
      }
      throw error;
    }
    return task;
  };

  const ensureAssignAuthorized = (caseId: string, owner: string) =>
    authorization.ensureAuthorized({
      operation: Operations[WriteOperations.AssignCase],
      entities: [{ id: caseId, owner }],
    });

  const refreshRun = async (taskId: string): Promise<CaseTask> => {
    const task = await getAuthorizedTask(taskId, WriteOperations.UpdateTask);
    if (task.workflow_run?.status !== 'running') {
      return task;
    }
    const management = await getTaskWorkflowManagement(clientArgs);
    await ensureCanReadTaskWorkflows(clientArgs);
    return settleTaskWorkflowRun({ clientArgs, management, task });
  };

  const startRun = async (taskId: string): Promise<CaseTask> => {
    const management = await getTaskWorkflowManagement(clientArgs);
    const task = await getAuthorizedTask(taskId, WriteOperations.UpdateTask);
    await ensureCanRunTaskWorkflows(clientArgs);
    const workflowId = ensureTaskCanRunWorkflow(task);
    const theCase = await caseService.getCase({ id: task.case_id });
    const run = await startTaskWorkflow({
      clientArgs,
      management,
      task,
      workflowId,
      theCase: {
        title: theCase.attributes.title,
        severity: theCase.attributes.severity,
        status: theCase.attributes.status,
        tags: theCase.attributes.tags,
      },
    });
    return recordTaskWorkflowStarted(clientArgs, task, run);
  };

  return Object.freeze<TasksSubClient>({
    async create(caseId, params) {
      try {
        await ensureEnabled();
        const request = decodeWithExcessOrThrowZod(TaskCreateRequestSchema)(params);
        const theCase = await getAuthorizedCase(caseId, WriteOperations.CreateTask);
        if (request.assignees?.length) {
          await ensureAssignAuthorized(caseId, theCase.attributes.owner);
        }
        await ensureTaskCapacity(taskService, caseId, 1);

        const task = await taskService.createTask({
          ...request,
          caseId,
          owner: theCase.attributes.owner,
          user,
          refresh: 'wait_for',
        });

        await userActionService.creator.createUserAction({
          userAction: {
            type: UserActionTypes.create_task,
            caseId,
            owner: task.owner,
            user,
            payload: {
              task: {
                id: task.id,
                title: task.title,
                status: task.status,
                priority: task.priority,
                assignees: task.assignees,
              },
            },
          },
        });

        return task;
      } catch (error) {
        throw createCaseError({
          message: `Failed to create task for case ${caseId}: ${error}`,
          error,
          logger,
        });
      }
    },

    async get(taskId) {
      try {
        await ensureEnabled();
        return await getAuthorizedTask(taskId, ReadOperations.GetTask);
      } catch (error) {
        throw createCaseError({ message: `Failed to get task ${taskId}: ${error}`, error, logger });
      }
    },

    async getByCase(caseId) {
      try {
        await ensureEnabled();
        await getAuthorizedCase(caseId, ReadOperations.FindTasks);
        const [tasks, commentCounts] = await Promise.all([
          taskService.getTasksByCase(caseId),
          taskCommentService.countByCase(caseId),
        ]);
        return {
          tasks: await settleRunningTaskWorkflows(clientArgs, tasks),
          comment_counts: commentCounts,
        };
      } catch (error) {
        throw createCaseError({
          message: `Failed to get tasks for case ${caseId}: ${error}`,
          error,
          logger,
        });
      }
    },

    async find(params) {
      try {
        await ensureEnabled();
        const request = decodeWithExcessOrThrowZod(TasksFindRequestSchema)(params);
        const { authorizedOwners } = await authorization.getAuthorizationFilter(
          Operations[ReadOperations.FindTasks]
        );

        // authorizedOwners is undefined when security is disabled.
        const requested = asArray(request.owner);
        const owners = !authorizedOwners
          ? requested
          : requested?.filter((o) => authorizedOwners.includes(o)) ?? authorizedOwners;
        const { page = 1, perPage = MAX_TASKS_PER_CASE } = request;

        if (owners?.length === 0) {
          return { tasks: [], page, per_page: perPage, total: 0 };
        }

        // Restricted cases the caller can't see are left out of the query itself, so neither
        // `total` nor `search` tells them anything about those cases' tasks.
        const hiddenCasesFilter = authorization.getHiddenCasesFilter();
        const hiddenCases = hiddenCasesFilter
          ? await caseService.findCaseIds({
              filter: hiddenCasesFilter,
              perPage: MAX_HIDDEN_CASES_PER_FIND,
            })
          : undefined;

        const { tasks, total } = await taskService.findTasks({
          excludeCaseIds: hiddenCases?.ids,
          owners,
          status: asArray(request.status),
          assignees: asArray(request.assignees),
          search: request.search,
          sortField: request.sortField,
          sortOrder: request.sortOrder,
          page,
          perPage,
        });

        // Backstop for a case restricted since the lookup above, and for hidden cases past
        // MAX_HIDDEN_CASES_PER_FIND; only then can `total` overcount.
        const caseIds = [...new Set(tasks.map(({ case_id: caseId }) => caseId))];
        const cases = caseIds.length > 0 ? await caseService.getCases({ caseIds }) : undefined;
        const visibleCaseIds = new Set(
          (cases?.saved_objects ?? []).flatMap((theCase) =>
            !isSOError(theCase) && authorization.isCaseVisible(theCase.attributes)
              ? [theCase.id]
              : []
          )
        );
        const visibleTasks = tasks.filter(({ case_id: caseId }) => visibleCaseIds.has(caseId));

        return {
          tasks: visibleTasks,
          page,
          per_page: perPage,
          total: total - (tasks.length - visibleTasks.length),
        };
      } catch (error) {
        throw createCaseError({ message: `Failed to find tasks: ${error}`, error, logger });
      }
    },

    async update(taskId, params) {
      try {
        await ensureEnabled();
        const { version, ...patch } = decodeWithExcessOrThrowZod(TaskPatchRequestSchema)(params);
        const existing = await getAuthorizedTask(taskId, WriteOperations.UpdateTask);
        if (patch.status === 'completed' && existing.workflow_run?.status === 'running') {
          throw Boom.conflict(
            `Task "${existing.title}" completes when its workflow run succeeds. Wait for the run to end.`
          );
        }
        if (patch.assignees !== undefined) {
          await ensureAssignAuthorized(existing.case_id, existing.owner);
        }

        const updated = await taskService.updateTask({
          ...patch,
          taskId,
          version,
          user,
          refresh: 'wait_for',
        });

        const changedFields = (Object.keys(patch) as Array<keyof typeof patch>).map((field) => ({
          field,
          old_value: existing[field],
          new_value: updated[field],
        }));

        await userActionService.creator.createUserAction({
          userAction: {
            type: UserActionTypes.update_task,
            caseId: existing.case_id,
            owner: existing.owner,
            user,
            payload: { task_id: taskId, task_title: updated.title, changed_fields: changedFields },
          },
        });

        return updated;
      } catch (error) {
        throw createCaseError({
          message: `Failed to update task ${taskId}: ${error}`,
          error,
          logger,
        });
      }
    },

    async delete(taskId) {
      try {
        await ensureEnabled();
        const task = await getAuthorizedTask(taskId, WriteOperations.DeleteTask);
        const deletedIds = await taskService.deleteTask(taskId, { refresh: true });
        await taskCommentService.deleteBy({ taskIds: deletedIds });
        const subtasksDeleted = deletedIds.length - 1;

        await userActionService.creator.createUserAction({
          userAction: {
            type: UserActionTypes.delete_task,
            caseId: task.case_id,
            owner: task.owner,
            user,
            payload: { task_id: taskId, task_title: task.title, subtasks_deleted: subtasksDeleted },
          },
        });
      } catch (error) {
        throw createCaseError({
          message: `Failed to delete task ${taskId}: ${error}`,
          error,
          logger,
        });
      }
    },

    async reorder(caseId, orderedTaskIds) {
      try {
        await ensureEnabled();
        await getAuthorizedCase(caseId, WriteOperations.ReorderTasks);

        const caseTaskIds = new Set((await taskService.getTasksByCase(caseId)).map((t) => t.id));
        const foreign = orderedTaskIds.filter((id) => !caseTaskIds.has(id));
        if (foreign.length > 0) {
          throw Boom.badRequest(`Tasks ${foreign.join(', ')} do not belong to case ${caseId}`);
        }

        await taskService.reorderTasks({ orderedTaskIds, refresh: 'wait_for' });
      } catch (error) {
        throw createCaseError({
          message: `Failed to reorder tasks for case ${caseId}: ${error}`,
          error,
          logger,
        });
      }
    },

    async applyTemplate(caseId, templateId) {
      try {
        await ensureEnabled();
        const theCase = await getAuthorizedCase(caseId, WriteOperations.ApplyTaskTemplate);
        const template = await taskTemplateService.getTemplate(templateId);
        await authorization.ensureAuthorized({
          operation: Operations[ReadOperations.GetTaskTemplate],
          entities: [{ id: template.id, owner: template.owner }],
        });

        return await applyTaskListToCase({
          caseId,
          owner: theCase.attributes.owner,
          template,
          user,
          taskService,
          userActionService,
        });
      } catch (error) {
        throw createCaseError({
          message: `Failed to apply task list ${templateId} to case ${caseId}: ${error}`,
          error,
          logger,
        });
      }
    },

    async getComments(taskId) {
      try {
        await ensureEnabled();
        await getAuthorizedTask(taskId, ReadOperations.GetTaskComments);
        return await taskCommentService.getByTask(taskId);
      } catch (error) {
        throw createCaseError({
          message: `Failed to get comments for task ${taskId}: ${error}`,
          error,
          logger,
        });
      }
    },

    async addComment(taskId, params) {
      try {
        await ensureEnabled();
        const { comment } = decodeWithExcessOrThrowZod(TaskCommentCreateRequestSchema)(params);
        const task = await getAuthorizedTask(taskId, WriteOperations.CreateTaskComment);
        const { total } = await taskCommentService.getByTask(taskId);
        if (total >= MAX_COMMENTS_PER_TASK) {
          throw Boom.badRequest(`A task can have at most ${MAX_COMMENTS_PER_TASK} comments`);
        }
        return await taskCommentService.create({
          caseId: task.case_id,
          taskId,
          comment,
          owner: task.owner,
          user,
          refresh: 'wait_for',
        });
      } catch (error) {
        throw createCaseError({
          message: `Failed to add a comment to task ${taskId}: ${error}`,
          error,
          logger,
        });
      }
    },

    async deleteComment(taskId, commentId) {
      try {
        await ensureEnabled();
        const task = await getAuthorizedTask(taskId, WriteOperations.DeleteTaskComment);
        const comment = await taskCommentService.get(commentId);
        if (comment.task_id !== task.id) {
          throw Boom.notFound(`Comment ${commentId} does not belong to task ${taskId}`);
        }
        await taskCommentService.delete(commentId, { refresh: 'wait_for' });
      } catch (error) {
        throw createCaseError({
          message: `Failed to delete comment ${commentId} from task ${taskId}: ${error}`,
          error,
          logger,
        });
      }
    },

    async runWorkflow(taskId) {
      try {
        await ensureEnabled();
        return await startRun(taskId);
      } catch (error) {
        throw createCaseError({
          message: `Failed to run the workflow of task ${taskId}: ${error}`,
          error,
          logger,
        });
      }
    },

    async refreshWorkflowRun(taskId) {
      try {
        await ensureEnabled();
        return await refreshRun(taskId);
      } catch (error) {
        throw createCaseError({
          message: `Failed to read the workflow run of task ${taskId}: ${error}`,
          error,
          logger,
        });
      }
    },

    async runWorkflowAndWait(taskId, { timeoutMs = DEFAULT_WORKFLOW_WAIT_MS } = {}) {
      try {
        await ensureEnabled();
        let task = await startRun(taskId);
        const deadline = Date.now() + timeoutMs;
        while (task.workflow_run?.status === 'running' && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, WORKFLOW_POLL_INTERVAL_MS));
          task = await refreshRun(taskId);
        }
        return task;
      } catch (error) {
        throw createCaseError({
          message: `Failed to run the workflow of task ${taskId}: ${error}`,
          error,
          logger,
        });
      }
    },
  });
};
