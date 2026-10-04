/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { MAX_COMMENTS_PER_TASK, MAX_TASKS_PER_CASE } from '../../../common/constants';
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
  TaskCommentCreateRequestRt,
  TaskCreateRequestRt,
  TaskPatchRequestRt,
  TasksFindRequestRt,
} from '../../../common/types/api/task/v1';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import type { CaseTaskComment } from '../../../common/types/domain/task_comment/v1';
import { UserActionTypes } from '../../../common/types/domain/user_action/action/v1';
import { Operations, ReadOperations, WriteOperations } from '../../authorization';
import { LICENSING_CASE_TASKS_FEATURE } from '../../common/constants';
import { createCaseError } from '../../common/error';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import type { CasesClientArgs } from '../types';
import { applyTaskListToCase, ensureTaskCapacity } from './apply_task_list';

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

  const getAuthorizedCase = async (caseId: string, operation: ReadOperations | WriteOperations) => {
    const theCase = await caseService.getCase({ id: caseId });
    await authorization.ensureAuthorized({
      operation: Operations[operation],
      entities: [{ id: theCase.id, owner: theCase.attributes.owner }],
    });
    return theCase;
  };

  const getAuthorizedTask = async (taskId: string, operation: ReadOperations | WriteOperations) => {
    const task = await taskService.getTask(taskId);
    await authorization.ensureAuthorized({
      operation: Operations[operation],
      entities: [{ id: task.case_id, owner: task.owner }],
    });
    return task;
  };

  const ensureAssignAuthorized = (caseId: string, owner: string) =>
    authorization.ensureAuthorized({
      operation: Operations[WriteOperations.AssignCase],
      entities: [{ id: caseId, owner }],
    });

  return Object.freeze<TasksSubClient>({
    async create(caseId, params) {
      try {
        await ensureEnabled();
        const request = decodeWithExcessOrThrow(TaskCreateRequestRt)(params);
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
        return { tasks, comment_counts: commentCounts };
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
        const request = decodeWithExcessOrThrow(TasksFindRequestRt)(params);
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

        const { tasks, total } = await taskService.findTasks({
          owners,
          status: asArray(request.status),
          assignees: asArray(request.assignees),
          search: request.search,
          sortField: request.sortField,
          sortOrder: request.sortOrder,
          page,
          perPage,
        });

        return { tasks, page, per_page: perPage, total };
      } catch (error) {
        throw createCaseError({ message: `Failed to find tasks: ${error}`, error, logger });
      }
    },

    async update(taskId, params) {
      try {
        await ensureEnabled();
        const { version, ...patch } = decodeWithExcessOrThrow(TaskPatchRequestRt)(params);
        const existing = await getAuthorizedTask(taskId, WriteOperations.UpdateTask);
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
        const { comment } = decodeWithExcessOrThrow(TaskCommentCreateRequestRt)(params);
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
  });
};
