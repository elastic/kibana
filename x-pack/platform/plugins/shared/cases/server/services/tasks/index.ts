/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { Logger, SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder } from '@kbn/es-query';
import { CASE_TASK_SAVED_OBJECT, MAX_TASKS_PER_CASE } from '../../../common/constants';
import type { CaseTask, CaseTaskAttributes } from '../../../common/types/domain/task/v1';
import { createCaseError, createCaseErrorFromSOError, isSOError } from '../../common/error';
import { buildCaseTaskCaseReference } from '../../saved_object_types/tasks';
import { getNextSortOrder, computeReorderedSortOrders, SORT_ORDER_GAP } from './sort_order';
import type {
  BulkCreateTasksArgs,
  CreateTaskArgs,
  FindTasksArgs,
  ReorderTasksArgs,
  UpdateTaskArgs,
} from './types';

const ATTR = `${CASE_TASK_SAVED_OBJECT}.attributes`;

const isFinished = (status: CaseTaskAttributes['status']) =>
  status === 'completed' || status === 'cancelled';

const toTask = (so: SavedObject<CaseTaskAttributes>): CaseTask => ({
  ...so.attributes,
  id: so.id,
  version: so.version ?? '',
});

const anyOf = (field: string, values: string[]): KueryNode =>
  values.length === 1
    ? nodeBuilder.is(field, values[0])
    : nodeBuilder.or(values.map((value) => nodeBuilder.is(field, value)));

export class CaseTaskService {
  constructor(
    private readonly deps: {
      log: Logger;
      unsecuredSavedObjectsClient: SavedObjectsClientContract;
    }
  ) {}

  public async createTask({ caseId, owner, user, refresh, ...task }: CreateTaskArgs) {
    const [created] = await this.bulkCreateTasks({ caseId, owner, user, refresh, tasks: [task] });
    return created;
  }

  public async bulkCreateTasks({
    caseId,
    owner,
    user,
    tasks,
    refresh,
  }: BulkCreateTasksArgs): Promise<CaseTask[]> {
    if (tasks.length === 0) {
      return [];
    }

    try {
      const parentIds = [
        ...new Set(tasks.flatMap((t) => (t.parent_task_id ? [t.parent_task_id] : []))),
      ];
      await Promise.all(parentIds.map((parentId) => this.ensureCanNestUnder(parentId, caseId)));

      // One sort_order lookup per sibling group, then hand out consecutive slots.
      const nextSortOrder = new Map<string | null, number>();
      for (const parentId of [null, ...parentIds]) {
        nextSortOrder.set(
          parentId,
          await getNextSortOrder({
            caseId,
            parentTaskId: parentId,
            unsecuredSavedObjectsClient: this.deps.unsecuredSavedObjectsClient,
          })
        );
      }

      const now = new Date().toISOString();
      const objects = tasks.map((t) => {
        const parentId = t.parent_task_id ?? null;
        const sortOrder = nextSortOrder.get(parentId) as number;
        nextSortOrder.set(parentId, sortOrder + SORT_ORDER_GAP);
        const status = t.status ?? 'open';

        const attributes: CaseTaskAttributes = {
          title: t.title,
          description: t.description ?? '',
          case_id: caseId,
          parent_task_id: parentId,
          status,
          priority: t.priority ?? 'medium',
          assignees: t.assignees ?? [],
          due_date: t.due_date ?? null,
          started_at: status === 'in_progress' ? now : null,
          completed_at: isFinished(status) ? now : null,
          sort_order: sortOrder,
          template_id: t.template_id ?? null,
          owner,
          created_at: now,
          created_by: user,
          updated_at: null,
          updated_by: null,
        };

        return {
          type: CASE_TASK_SAVED_OBJECT,
          attributes,
          references: [buildCaseTaskCaseReference(caseId)],
        };
      });

      const result = await this.deps.unsecuredSavedObjectsClient.bulkCreate<CaseTaskAttributes>(
        objects,
        { refresh }
      );

      return result.saved_objects.map((so) => {
        if (isSOError(so)) {
          throw createCaseErrorFromSOError(so.error, 'Failed to create task');
        }
        return toTask(so as SavedObject<CaseTaskAttributes>);
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to create tasks for case ${caseId}: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }

  public async getTask(taskId: string): Promise<CaseTask> {
    try {
      const so = await this.deps.unsecuredSavedObjectsClient.get<CaseTaskAttributes>(
        CASE_TASK_SAVED_OBJECT,
        taskId
      );
      return toTask(so);
    } catch (error) {
      throw createCaseError({
        message: `Failed to get task ${taskId}: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }

  public async getTasksByCase(caseId: string): Promise<CaseTask[]> {
    const { tasks } = await this.findTasks({ caseIds: [caseId], perPage: MAX_TASKS_PER_CASE });
    return tasks;
  }

  public async findTasks({
    caseIds,
    owners,
    status,
    assignees,
    parentTaskId,
    search,
    sortField = 'sort_order',
    sortOrder = 'asc',
    page = 1,
    perPage = MAX_TASKS_PER_CASE,
  }: FindTasksArgs): Promise<{ tasks: CaseTask[]; total: number }> {
    try {
      const filters: KueryNode[] = [];
      if (caseIds?.length) filters.push(anyOf(`${ATTR}.case_id`, caseIds));
      if (owners?.length) filters.push(anyOf(`${ATTR}.owner`, owners));
      if (status?.length) filters.push(anyOf(`${ATTR}.status`, status));
      if (assignees?.length) filters.push(anyOf(`${ATTR}.assignees.uid`, assignees));
      if (parentTaskId) filters.push(nodeBuilder.is(`${ATTR}.parent_task_id`, parentTaskId));

      const result = await this.deps.unsecuredSavedObjectsClient.find<CaseTaskAttributes>({
        type: CASE_TASK_SAVED_OBJECT,
        filter: filters.length > 0 ? nodeBuilder.and(filters) : undefined,
        sortField,
        sortOrder,
        page,
        perPage: Math.min(perPage, MAX_TASKS_PER_CASE),
        search,
        searchFields: search ? ['title', 'description'] : undefined,
      });

      return { tasks: result.saved_objects.map(toTask), total: result.total };
    } catch (error) {
      throw createCaseError({
        message: `Failed to find tasks: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }

  public async updateTask({
    taskId,
    version,
    user,
    refresh,
    ...patch
  }: UpdateTaskArgs): Promise<CaseTask> {
    try {
      const existing = await this.getTask(taskId);
      const now = new Date().toISOString();

      const updated: Partial<CaseTaskAttributes> = {
        ...patch,
        updated_at: now,
        updated_by: user,
      };
      if (patch.status === 'in_progress' && existing.started_at === null) {
        updated.started_at = now;
      }
      if (patch.status !== undefined) {
        updated.completed_at = isFinished(patch.status) ? existing.completed_at ?? now : null;
      }

      const so = await this.deps.unsecuredSavedObjectsClient.update<CaseTaskAttributes>(
        CASE_TASK_SAVED_OBJECT,
        taskId,
        updated,
        { version, refresh }
      );

      return { ...existing, ...updated, version: so.version ?? existing.version };
    } catch (error) {
      throw createCaseError({
        message: `Failed to update task ${taskId}: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }

  /** Deletes a task and its sub-tasks. Returns every deleted id, the task itself first. */
  public async deleteTask(
    taskId: string,
    { refresh }: { refresh?: boolean } = {}
  ): Promise<string[]> {
    try {
      const { tasks: children } = await this.findTasks({ parentTaskId: taskId });
      const ids = [taskId, ...children.map((t) => t.id)];
      await this.deps.unsecuredSavedObjectsClient.bulkDelete(
        ids.map((id) => ({ type: CASE_TASK_SAVED_OBJECT, id })),
        { refresh }
      );
      return ids;
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete task ${taskId}: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }

  /** Removes every task of a case. Used when the case itself is deleted. */
  public async deleteTasksByCase(caseId: string): Promise<void> {
    try {
      const tasks = await this.getTasksByCase(caseId);
      if (tasks.length === 0) {
        return;
      }
      await this.deps.unsecuredSavedObjectsClient.bulkDelete(
        tasks.map(({ id }) => ({ type: CASE_TASK_SAVED_OBJECT, id }))
      );
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete tasks for case ${caseId}: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }

  public async reorderTasks({ orderedTaskIds, refresh }: ReorderTasksArgs): Promise<void> {
    if (orderedTaskIds.length === 0) {
      return;
    }
    try {
      await this.deps.unsecuredSavedObjectsClient.bulkUpdate<Partial<CaseTaskAttributes>>(
        computeReorderedSortOrders(orderedTaskIds).map(({ id, sort_order }) => ({
          type: CASE_TASK_SAVED_OBJECT,
          id,
          attributes: { sort_order },
        })),
        { refresh }
      );
    } catch (error) {
      throw createCaseError({
        message: `Failed to reorder tasks: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }

  /** Sub-tasks nest one level: the parent must be a root task of the same case. */
  private async ensureCanNestUnder(parentId: string, caseId: string) {
    const parent = await this.getTask(parentId);
    if (parent.case_id !== caseId) {
      throw Boom.badRequest(`Parent task ${parentId} belongs to another case`);
    }
    if (parent.parent_task_id !== null) {
      throw Boom.badRequest('Sub-tasks cannot have their own sub-tasks');
    }
  }
}
