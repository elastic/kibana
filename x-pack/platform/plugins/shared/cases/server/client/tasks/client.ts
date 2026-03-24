/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type {
  CaseTask,
  CaseTaskStatus,
  CaseTaskPriority,
  CaseTaskAssignee,
} from '../../../common/types/domain/task/v1';
import { UserActionTypes } from '../../../common/types/domain/user_action/action/v1';
import { createCaseError } from '../../common/error';
import { Operations, ReadOperations, WriteOperations } from '../../authorization';
import type { FindTasksArgs, MyTasksArgs, ReorderTasksArgs as ServiceReorderArgs } from '../../services/tasks/types';
import type { CasesClientArgs } from '../types';

export interface CreateTaskParams {
  caseId: string;
  title: string;
  description?: string;
  status?: CaseTaskStatus;
  priority?: CaseTaskPriority;
  assignees?: CaseTaskAssignee[];
  due_date?: string | null;
  parent_task_id?: string | null;
  owner: string;
}

export interface UpdateTaskParams {
  taskId: string;
  version: string;
  title?: string;
  description?: string;
  status?: CaseTaskStatus;
  priority?: CaseTaskPriority;
  assignees?: CaseTaskAssignee[];
  due_date?: string | null;
}

export type FindTasksParams = FindTasksArgs;
export type GetMyTasksParams = MyTasksArgs;
export type ReorderTasksParams = ServiceReorderArgs;

export interface ApplyTemplateParams {
  caseId: string;
  templateId: string;
  owner: string;
  due_date_anchor?: string;
}

export interface TasksSubClient {
  create(params: CreateTaskParams): Promise<CaseTask>;
  get(taskId: string): Promise<CaseTask>;
  find(params: FindTasksParams): Promise<{ tasks: CaseTask[]; total: number }>;
  update(params: UpdateTaskParams): Promise<CaseTask>;
  delete(taskId: string): Promise<void>;
  reorder(params: ReorderTasksParams): Promise<void>;
  getMyTasks(params: GetMyTasksParams): Promise<{ tasks: CaseTask[]; total: number }>;
  applyTemplate(params: ApplyTemplateParams): Promise<CaseTask[]>;
}

export const createTasksSubClient = (clientArgs: CasesClientArgs): TasksSubClient => {
  const {
    services: { taskService, userActionService },
    user,
    authorization,
    logger,
    config,
  } = clientArgs;

  const assertTasksEnabled = () => {
    if (!config.tasks?.enabled) {
      throw Boom.notFound('Tasks feature is not enabled');
    }
  };

  const tasksSubClient: TasksSubClient = {
    async create(params: CreateTaskParams): Promise<CaseTask> {
      assertTasksEnabled();
      try {
        await authorization.ensureAuthorized({
          operation: Operations[WriteOperations.CreateTask],
          entities: [{ owner: params.owner, id: params.caseId }],
        });

        const task = await taskService.createTask({
          ...params,
          user,
        });

        await userActionService.creator.createUserAction({
          userAction: {
            type: UserActionTypes.create_task,
            caseId: params.caseId,
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
            owner: params.owner,
          },
        });

        return task;
      } catch (error) {
        throw createCaseError({ message: `Failed to create task: ${error}`, error, logger });
      }
    },

    async get(taskId: string): Promise<CaseTask> {
      assertTasksEnabled();
      try {
        const task = await taskService.getTask(taskId);

        await authorization.ensureAuthorized({
          operation: Operations[ReadOperations.GetTask],
          entities: [{ owner: task.owner, id: taskId }],
        });

        return task;
      } catch (error) {
        throw createCaseError({ message: `Failed to get task ${taskId}: ${error}`, error, logger });
      }
    },

    async find(params: FindTasksParams): Promise<{ tasks: CaseTask[]; total: number }> {
      assertTasksEnabled();
      try {
        const { ensureSavedObjectsAreAuthorized } = await authorization.getAuthorizationFilter(
          Operations[ReadOperations.FindTasks]
        );

        const result = await taskService.findTasks(params);

        ensureSavedObjectsAreAuthorized(
          result.tasks.map((t) => ({ owner: t.owner, id: t.id }))
        );

        return result;
      } catch (error) {
        throw createCaseError({ message: `Failed to find tasks: ${error}`, error, logger });
      }
    },

    async update(params: UpdateTaskParams): Promise<CaseTask> {
      assertTasksEnabled();
      try {
        const existing = await taskService.getTask(params.taskId);

        await authorization.ensureAuthorized({
          operation: Operations[WriteOperations.UpdateTask],
          entities: [{ owner: existing.owner, id: params.taskId }],
        });

        const updated = await taskService.updateTask({
          ...params,
          user,
        });

        await userActionService.creator.createUserAction({
          userAction: {
            type: UserActionTypes.update_task,
            caseId: existing.case_id,
            user,
            payload: {
              task_id: params.taskId,
              task_title: existing.title,
              changed_fields: [],
            },
            owner: existing.owner,
          },
        });

        return updated;
      } catch (error) {
        throw createCaseError({
          message: `Failed to update task ${params.taskId}: ${error}`,
          error,
          logger,
        });
      }
    },

    async delete(taskId: string): Promise<void> {
      assertTasksEnabled();
      try {
        const task = await taskService.getTask(taskId);

        await authorization.ensureAuthorized({
          operation: Operations[WriteOperations.DeleteTask],
          entities: [{ owner: task.owner, id: taskId }],
        });

        await taskService.deleteTask(taskId);

        await userActionService.creator.createUserAction({
          userAction: {
            type: UserActionTypes.delete_task,
            caseId: task.case_id,
            user,
            payload: {
              task_id: taskId,
              task_title: task.title,
              subtasks_deleted: 0,
            },
            owner: task.owner,
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

    async reorder(params: ReorderTasksParams): Promise<void> {
      assertTasksEnabled();
      try {
        if (params.orderedTaskIds.length > 0) {
          const firstTask = await taskService.getTask(params.orderedTaskIds[0]);
          await authorization.ensureAuthorized({
            operation: Operations[WriteOperations.ReorderTasks],
            entities: [{ owner: firstTask.owner, id: params.caseId }],
          });
        }

        await taskService.reorderTasks(params);
      } catch (error) {
        throw createCaseError({ message: `Failed to reorder tasks: ${error}`, error, logger });
      }
    },

    async getMyTasks(
      params: GetMyTasksParams
    ): Promise<{ tasks: CaseTask[]; total: number }> {
      assertTasksEnabled();
      try {
        const { ensureSavedObjectsAreAuthorized } = await authorization.getAuthorizationFilter(
          Operations[ReadOperations.FindTasks]
        );

        const result = await taskService.getMyTasks(params);

        ensureSavedObjectsAreAuthorized(
          result.tasks.map((t) => ({ owner: t.owner, id: t.id }))
        );

        return result;
      } catch (error) {
        throw createCaseError({ message: `Failed to get my tasks: ${error}`, error, logger });
      }
    },

    async applyTemplate(params: ApplyTemplateParams): Promise<CaseTask[]> {
      assertTasksEnabled();
      const { taskTemplateService } = clientArgs.services;
      try {
        await authorization.ensureAuthorized({
          operation: Operations[WriteOperations.ApplyTaskTemplate],
          entities: [{ owner: params.owner, id: params.caseId }],
        });

        const tasks = await taskTemplateService.applyTemplate({
          ...params,
          user,
        });

        await userActionService.creator.createUserAction({
          userAction: {
            type: UserActionTypes.apply_task_template,
            caseId: params.caseId,
            user,
            payload: {
              template_id: params.templateId,
              template_name: '',
              tasks_created: tasks.length,
            },
            owner: params.owner,
          },
        });

        return tasks;
      } catch (error) {
        throw createCaseError({
          message: `Failed to apply task template to case ${params.caseId}: ${error}`,
          error,
          logger,
        });
      }
    },
  };

  return Object.freeze(tasksSubClient);
};
