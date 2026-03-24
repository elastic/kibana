/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';
import { CASE_TASK_SAVED_OBJECT } from '../../../common/constants';
import type {
  CaseTask,
  CaseTaskAttributes,
} from '../../../common/types/domain/task/v1';
import { createCaseError } from '../../common/error';
import { buildCaseTaskCaseReference } from '../../saved_object_types/tasks';
import { syncTaskSummary } from './task_summary';
import { getNextSortOrder, computeReorderedSortOrders } from './sort_order';
import type {
  CreateTaskArgs,
  BulkCreateTasksArgs,
  UpdateTaskArgs,
  BulkUpdateTasksArgs,
  FindTasksArgs,
  MyTasksArgs,
  ReorderTasksArgs,
  TaskFilterArgs,
} from './types';

/** Maximum nesting depth: task → subtask → sub-subtask = 2 levels below root */
const MAX_SUBTASK_DEPTH = 2;

export class CaseTaskService {
  private readonly log: Logger;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;

  constructor({
    log,
    unsecuredSavedObjectsClient,
  }: {
    log: Logger;
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
  }) {
    this.log = log;
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  public async createTask(args: CreateTaskArgs): Promise<CaseTask> {
    const {
      caseId,
      title,
      description = '',
      status = 'open',
      priority = 'medium',
      assignees = [],
      due_date = null,
      parent_task_id = null,
      custom_fields = [],
      template_id = null,
      owner,
      user,
      refresh,
    } = args;

    try {
      if (parent_task_id) {
        await this.validateDepth(parent_task_id);
      }

      const sort_order = await getNextSortOrder({
        caseId,
        parentTaskId: parent_task_id,
        unsecuredSavedObjectsClient: this.unsecuredSavedObjectsClient,
        logger: this.log,
      });

      const now = new Date().toISOString();

      const attributes: CaseTaskAttributes = {
        title,
        description,
        case_id: caseId,
        parent_task_id,
        status,
        priority,
        assignees,
        due_date,
        started_at: status === 'in_progress' ? now : null,
        completed_at: status === 'completed' || status === 'cancelled' ? now : null,
        sort_order,
        template_id,
        custom_fields,
        required_role: null,
        owner_team: null,
        owner,
        created_at: now,
        created_by: user,
        updated_at: null,
        updated_by: null,
      };

      const so = await this.unsecuredSavedObjectsClient.create<CaseTaskAttributes>(
        CASE_TASK_SAVED_OBJECT,
        attributes,
        {
          refresh,
          references: [buildCaseTaskCaseReference(caseId)],
        }
      );

      await syncTaskSummary({
        caseId,
        unsecuredSavedObjectsClient: this.unsecuredSavedObjectsClient,
        logger: this.log,
      });

      return this.transformToTask(so);
    } catch (error) {
      throw createCaseError({
        message: `Failed to create task for case ${caseId}: ${error}`,
        error,
        logger: this.log,
      });
    }
  }

  public async bulkCreateTasks(args: BulkCreateTasksArgs): Promise<CaseTask[]> {
    const { tasks, refresh } = args;
    if (tasks.length === 0) return [];

    const caseId = tasks[0].caseId;
    const now = new Date().toISOString();

    try {
      // Validate depth for all subtasks up-front
      for (const t of tasks) {
        if (t.parent_task_id) {
          await this.validateDepth(t.parent_task_id);
        }
      }

      const objects = await Promise.all(
        tasks.map(async (t) => {
          const sort_order = await getNextSortOrder({
            caseId: t.caseId,
            parentTaskId: t.parent_task_id ?? null,
            unsecuredSavedObjectsClient: this.unsecuredSavedObjectsClient,
            logger: this.log,
          });

          const attrs: CaseTaskAttributes = {
            title: t.title,
            description: t.description ?? '',
            case_id: t.caseId,
            parent_task_id: t.parent_task_id ?? null,
            status: t.status ?? 'open',
            priority: t.priority ?? 'medium',
            assignees: t.assignees ?? [],
            due_date: t.due_date ?? null,
            started_at: t.status === 'in_progress' ? now : null,
            completed_at:
              t.status === 'completed' || t.status === 'cancelled' ? now : null,
            sort_order,
            template_id: t.template_id ?? null,
            custom_fields: t.custom_fields ?? [],
            required_role: null,
            owner_team: null,
            owner: t.owner,
            created_at: now,
            created_by: t.user,
            updated_at: null,
            updated_by: null,
          };

          return {
            type: CASE_TASK_SAVED_OBJECT,
            attributes: attrs,
            references: [buildCaseTaskCaseReference(t.caseId)],
          };
        })
      );

      const result = await this.unsecuredSavedObjectsClient.bulkCreate<CaseTaskAttributes>(
        objects,
        { refresh }
      );

      await syncTaskSummary({
        caseId,
        unsecuredSavedObjectsClient: this.unsecuredSavedObjectsClient,
        logger: this.log,
      });

      return result.saved_objects.map((so) => this.transformToTask(so));
    } catch (error) {
      throw createCaseError({
        message: `Failed to bulk create tasks for case ${caseId}: ${error}`,
        error,
        logger: this.log,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  public async getTask(taskId: string): Promise<CaseTask> {
    try {
      const so = await this.unsecuredSavedObjectsClient.get<CaseTaskAttributes>(
        CASE_TASK_SAVED_OBJECT,
        taskId
      );
      return this.transformToTask(so);
    } catch (error) {
      throw createCaseError({
        message: `Failed to get task ${taskId}: ${error}`,
        error,
        logger: this.log,
      });
    }
  }

  public async getTasksByCase(caseId: string, args?: TaskFilterArgs): Promise<CaseTask[]> {
    try {
      const result = await this.findTasks({ ...args, caseIds: [caseId], per_page: 10000 });
      return result.tasks;
    } catch (error) {
      throw createCaseError({
        message: `Failed to get tasks for case ${caseId}: ${error}`,
        error,
        logger: this.log,
      });
    }
  }

  public async findTasks(
    args: FindTasksArgs
  ): Promise<{ tasks: CaseTask[]; total: number }> {
    const {
      caseIds,
      owners,
      status,
      priority,
      assignees,
      due_date_from,
      due_date_to,
      parent_task_id,
      sort_field = 'sort_order',
      sort_order: sortOrder = 'asc',
      page = 1,
      per_page = 50,
      search,
    } = args;

    try {
      const filters = this.buildFilters({
        caseIds,
        owners,
        status,
        priority,
        assignees,
        due_date_from,
        due_date_to,
        parent_task_id,
      });

      const result = await this.unsecuredSavedObjectsClient.find<CaseTaskAttributes>({
        type: CASE_TASK_SAVED_OBJECT,
        filter: filters.length > 0 ? nodeBuilder.and(filters) : undefined,
        sortField: sort_field,
        sortOrder,
        page,
        perPage: Math.min(per_page, 200),
        search: search ?? undefined,
        searchFields: search ? ['title', 'description'] : undefined,
      });

      return {
        tasks: result.saved_objects.map((so) => this.transformToTask(so)),
        total: result.total,
      };
    } catch (error) {
      throw createCaseError({
        message: `Failed to find tasks: ${error}`,
        error,
        logger: this.log,
      });
    }
  }

  public async getMyTasks(
    args: MyTasksArgs
  ): Promise<{ tasks: CaseTask[]; total: number }> {
    const { userProfileUid, ...filterArgs } = args;
    return this.findTasks({
      ...filterArgs,
      assignees: [userProfileUid, ...(filterArgs.assignees ?? [])],
    });
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  public async updateTask(args: UpdateTaskArgs): Promise<CaseTask> {
    const { taskId, user, version, refresh, ...patch } = args;

    try {
      // Validate reparenting depth if parent_task_id is being changed
      if (patch.parent_task_id !== undefined && patch.parent_task_id !== null) {
        await this.validateDepth(patch.parent_task_id);
      }

      const now = new Date().toISOString();
      const existing = await this.getTask(taskId);

      const statusTransitions: Partial<CaseTaskAttributes> = {};
      if (patch.status) {
        if (patch.status === 'in_progress' && !existing.started_at) {
          statusTransitions.started_at = now;
        }
        if (
          (patch.status === 'completed' || patch.status === 'cancelled') &&
          !existing.completed_at
        ) {
          statusTransitions.completed_at = now;
        }
      }

      const updatedAttributes: Partial<CaseTaskAttributes> = {
        ...patch,
        ...statusTransitions,
        updated_at: now,
        updated_by: user,
      };

      const so = await this.unsecuredSavedObjectsClient.update<CaseTaskAttributes>(
        CASE_TASK_SAVED_OBJECT,
        taskId,
        updatedAttributes,
        { version, refresh }
      );

      await syncTaskSummary({
        caseId: existing.case_id,
        unsecuredSavedObjectsClient: this.unsecuredSavedObjectsClient,
        logger: this.log,
      });

      // Merge the existing SO with the update result since SO update only returns changed fields
      return this.transformToTask({
        ...so,
        attributes: { ...(existing as CaseTaskAttributes), ...updatedAttributes },
      } as SavedObject<CaseTaskAttributes>);
    } catch (error) {
      throw createCaseError({
        message: `Failed to update task ${taskId}: ${error}`,
        error,
        logger: this.log,
      });
    }
  }

  public async bulkUpdateTasks(args: BulkUpdateTasksArgs): Promise<CaseTask[]> {
    const { updates, refresh } = args;
    if (updates.length === 0) return [];

    const now = new Date().toISOString();

    try {
      const objects = updates.map(({ taskId, attributes, version }) => ({
        type: CASE_TASK_SAVED_OBJECT,
        id: taskId,
        attributes: { ...attributes, updated_at: now },
        version,
      }));

      const result = await this.unsecuredSavedObjectsClient.bulkUpdate<Partial<CaseTaskAttributes>>(
        objects,
        { refresh }
      );

      // Sync summary once after all updates. Get caseId from first fetched task.
      const firstTaskId = updates[0]?.taskId;
      if (firstTaskId) {
        const firstTask = await this.getTask(firstTaskId);
        await syncTaskSummary({
          caseId: firstTask.case_id,
          unsecuredSavedObjectsClient: this.unsecuredSavedObjectsClient,
          logger: this.log,
        });
      }

      // bulkUpdate returns partial SOs; re-fetch to get full objects
      return Promise.all(result.saved_objects.map((so) => this.getTask(so.id)));
    } catch (error) {
      throw createCaseError({
        message: `Failed to bulk update tasks: ${error}`,
        error,
        logger: this.log,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  public async deleteTask(taskId: string): Promise<void> {
    try {
      const task = await this.getTask(taskId);
      const caseId = task.case_id;

      // Cascade: collect all descendants
      const descendants = await this.collectDescendants(taskId);
      const allIds = [taskId, ...descendants];

      await this.unsecuredSavedObjectsClient.bulkDelete(
        allIds.map((id) => ({ type: CASE_TASK_SAVED_OBJECT, id }))
      );

      await syncTaskSummary({
        caseId,
        unsecuredSavedObjectsClient: this.unsecuredSavedObjectsClient,
        logger: this.log,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete task ${taskId}: ${error}`,
        error,
        logger: this.log,
      });
    }
  }

  public async bulkDeleteTasks(taskIds: string[]): Promise<void> {
    if (taskIds.length === 0) return;

    try {
      // Collect all descendants for every task being deleted
      const allDescendants = await Promise.all(taskIds.map((id) => this.collectDescendants(id)));
      const allIds = [...new Set([...taskIds, ...allDescendants.flat()])];

      // Get caseId before deleting
      const firstTask = await this.getTask(taskIds[0]);
      const caseId = firstTask.case_id;

      await this.unsecuredSavedObjectsClient.bulkDelete(
        allIds.map((id) => ({ type: CASE_TASK_SAVED_OBJECT, id }))
      );

      await syncTaskSummary({
        caseId,
        unsecuredSavedObjectsClient: this.unsecuredSavedObjectsClient,
        logger: this.log,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to bulk delete tasks: ${error}`,
        error,
        logger: this.log,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Reorder
  // ---------------------------------------------------------------------------

  public async reorderTasks(args: ReorderTasksArgs): Promise<void> {
    const { caseId, orderedTaskIds, refresh } = args;
    if (orderedTaskIds.length === 0) return;

    try {
      const reordered = computeReorderedSortOrders(orderedTaskIds);

      await this.unsecuredSavedObjectsClient.bulkUpdate<Partial<CaseTaskAttributes>>(
        reordered.map(({ id, sort_order }) => ({
          type: CASE_TASK_SAVED_OBJECT,
          id,
          attributes: { sort_order },
        })),
        { refresh }
      );
    } catch (error) {
      throw createCaseError({
        message: `Failed to reorder tasks for case ${caseId}: ${error}`,
        error,
        logger: this.log,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Validates that adding a child to parentTaskId will not exceed MAX_SUBTASK_DEPTH.
   * Walks the parent_task_id chain upward.
   */
  private async validateDepth(parentTaskId: string): Promise<void> {
    let currentId: string | null | undefined = parentTaskId;
    let depth = 1;

    // Use loose inequality to stop on both null and undefined parent_task_id
    while (currentId != null) {
      if (depth > MAX_SUBTASK_DEPTH) {
        throw Object.assign(
          new Error(
            `Maximum subtask depth of ${MAX_SUBTASK_DEPTH} exceeded. ` +
              `Tasks can be nested at most ${MAX_SUBTASK_DEPTH} levels deep.`
          ),
          { statusCode: 400 }
        );
      }

      try {
        const parent: SavedObject<CaseTaskAttributes> =
          await this.unsecuredSavedObjectsClient.get<CaseTaskAttributes>(
            CASE_TASK_SAVED_OBJECT,
            currentId as string
          );
        currentId = parent.attributes.parent_task_id;
        depth++;
      } catch {
        // Parent not found — chain is broken, stop walking
        break;
      }
    }
  }

  /**
   * Collects all descendant task IDs for a given task (breadth-first).
   * Used for cascade delete.
   */
  private async collectDescendants(taskId: string): Promise<string[]> {
    const descendants: string[] = [];
    const queue = [taskId];

    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = await this.unsecuredSavedObjectsClient.find<CaseTaskAttributes>({
        type: CASE_TASK_SAVED_OBJECT,
        filter: nodeBuilder.is(
          `${CASE_TASK_SAVED_OBJECT}.attributes.parent_task_id`,
          parentId
        ),
        fields: ['parent_task_id'],
        page: 1,
        perPage: 1000,
      });

      for (const child of children.saved_objects) {
        descendants.push(child.id);
        queue.push(child.id);
      }
    }

    return descendants;
  }

  /**
   * Builds ES KueryNode filters from TaskFilterArgs / FindTasksArgs.
   */
  private buildFilters({
    caseIds,
    owners,
    status,
    priority,
    assignees,
    due_date_from,
    due_date_to,
    parent_task_id,
  }: {
    caseIds?: string[];
    owners?: string[];
    status?: string | string[];
    priority?: string | string[];
    assignees?: string[];
    due_date_from?: string;
    due_date_to?: string;
    parent_task_id?: string | null;
  }) {
    const filters = [];

    if (caseIds && caseIds.length > 0) {
      const caseFilter =
        caseIds.length === 1
          ? nodeBuilder.is(`${CASE_TASK_SAVED_OBJECT}.attributes.case_id`, caseIds[0])
          : nodeBuilder.or(
              caseIds.map((id) =>
                nodeBuilder.is(`${CASE_TASK_SAVED_OBJECT}.attributes.case_id`, id)
              )
            );
      filters.push(caseFilter);
    }

    if (owners && owners.length > 0) {
      const ownerFilter =
        owners.length === 1
          ? nodeBuilder.is(`${CASE_TASK_SAVED_OBJECT}.attributes.owner`, owners[0])
          : nodeBuilder.or(
              owners.map((o) =>
                nodeBuilder.is(`${CASE_TASK_SAVED_OBJECT}.attributes.owner`, o)
              )
            );
      filters.push(ownerFilter);
    }

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      const statusFilter =
        statuses.length === 1
          ? nodeBuilder.is(`${CASE_TASK_SAVED_OBJECT}.attributes.status`, statuses[0])
          : nodeBuilder.or(
              statuses.map((s) =>
                nodeBuilder.is(`${CASE_TASK_SAVED_OBJECT}.attributes.status`, s)
              )
            );
      filters.push(statusFilter);
    }

    if (priority) {
      const priorities = Array.isArray(priority) ? priority : [priority];
      const priorityFilter =
        priorities.length === 1
          ? nodeBuilder.is(`${CASE_TASK_SAVED_OBJECT}.attributes.priority`, priorities[0])
          : nodeBuilder.or(
              priorities.map((p) =>
                nodeBuilder.is(`${CASE_TASK_SAVED_OBJECT}.attributes.priority`, p)
              )
            );
      filters.push(priorityFilter);
    }

    if (assignees && assignees.length > 0) {
      const assigneeFilter = nodeBuilder.or(
        assignees.map((uid) =>
          nodeBuilder.is(`${CASE_TASK_SAVED_OBJECT}.attributes.assignees.uid`, uid)
        )
      );
      filters.push(assigneeFilter);
    }

    if (due_date_from) {
      filters.push(
        nodeBuilder.range(
          `${CASE_TASK_SAVED_OBJECT}.attributes.due_date`,
          'gte',
          due_date_from
        )
      );
    }

    if (due_date_to) {
      filters.push(
        nodeBuilder.range(
          `${CASE_TASK_SAVED_OBJECT}.attributes.due_date`,
          'lte',
          due_date_to
        )
      );
    }

    if (parent_task_id === null) {
      // Root tasks only: parent_task_id is null/missing
      filters.push(
        nodeBuilder.is(`${CASE_TASK_SAVED_OBJECT}.attributes.parent_task_id`, '__null__')
      );
    } else if (parent_task_id !== undefined) {
      filters.push(
        nodeBuilder.is(
          `${CASE_TASK_SAVED_OBJECT}.attributes.parent_task_id`,
          parent_task_id
        )
      );
    }

    return filters;
  }

  /**
   * Converts a SavedObject<CaseTaskAttributes> to the CaseTask domain type.
   */
  private transformToTask(so: SavedObject<CaseTaskAttributes>): CaseTask {
    return {
      ...so.attributes,
      id: so.id,
      version: so.version ?? '',
    };
  }
}
