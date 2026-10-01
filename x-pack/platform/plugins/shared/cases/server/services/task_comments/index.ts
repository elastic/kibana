/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';
import {
  CASE_SAVED_OBJECT,
  CASE_TASK_COMMENT_SAVED_OBJECT,
  CASE_TASK_SAVED_OBJECT,
  MAX_COMMENTS_PER_TASK,
  MAX_TASKS_PER_CASE,
} from '../../../common/constants';
import type {
  CaseTaskComment,
  CaseTaskCommentAttributes,
} from '../../../common/types/domain/task_comment/v1';
import { createCaseError } from '../../common/error';
import type { User } from '../../common/types/user';
import type { IndexRefresh } from '../types';

const ATTR = `${CASE_TASK_COMMENT_SAVED_OBJECT}.attributes`;

const toComment = (so: SavedObject<CaseTaskCommentAttributes>): CaseTaskComment => ({
  ...so.attributes,
  id: so.id,
  version: so.version ?? '',
});

interface CountsAggregation {
  byTask: { buckets: Array<{ key: string; doc_count: number }> };
}

export class CaseTaskCommentService {
  constructor(
    private readonly deps: {
      log: Logger;
      unsecuredSavedObjectsClient: SavedObjectsClientContract;
    }
  ) {}

  public async create({
    caseId,
    taskId,
    comment,
    owner,
    user,
    refresh,
  }: {
    caseId: string;
    taskId: string;
    comment: string;
    owner: string;
    user: User;
  } & IndexRefresh): Promise<CaseTaskComment> {
    try {
      const so = await this.deps.unsecuredSavedObjectsClient.create<CaseTaskCommentAttributes>(
        CASE_TASK_COMMENT_SAVED_OBJECT,
        {
          task_id: taskId,
          case_id: caseId,
          comment,
          owner,
          created_at: new Date().toISOString(),
          created_by: user,
        },
        {
          refresh,
          references: [
            { type: CASE_SAVED_OBJECT, id: caseId, name: 'parentCase' },
            { type: CASE_TASK_SAVED_OBJECT, id: taskId, name: 'parentTask' },
          ],
        }
      );
      return toComment(so);
    } catch (error) {
      throw createCaseError({
        message: `Failed to create comment for task ${taskId}: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }

  public async get(commentId: string): Promise<CaseTaskComment> {
    try {
      const so = await this.deps.unsecuredSavedObjectsClient.get<CaseTaskCommentAttributes>(
        CASE_TASK_COMMENT_SAVED_OBJECT,
        commentId
      );
      return toComment(so);
    } catch (error) {
      throw createCaseError({
        message: `Failed to get task comment ${commentId}: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }

  /** Oldest first, so the thread reads top to bottom. */
  public async getByTask(taskId: string): Promise<{ comments: CaseTaskComment[]; total: number }> {
    try {
      const result = await this.deps.unsecuredSavedObjectsClient.find<CaseTaskCommentAttributes>({
        type: CASE_TASK_COMMENT_SAVED_OBJECT,
        filter: nodeBuilder.is(`${ATTR}.task_id`, taskId),
        sortField: 'created_at',
        sortOrder: 'asc',
        perPage: MAX_COMMENTS_PER_TASK,
      });
      return { comments: result.saved_objects.map(toComment), total: result.total };
    } catch (error) {
      throw createCaseError({
        message: `Failed to get comments for task ${taskId}: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }

  /** Comment count per task for one case, from an aggregation rather than loading the comments. */
  public async countByCase(caseId: string): Promise<Record<string, number>> {
    try {
      const result = await this.deps.unsecuredSavedObjectsClient.find<
        CaseTaskCommentAttributes,
        CountsAggregation
      >({
        type: CASE_TASK_COMMENT_SAVED_OBJECT,
        filter: nodeBuilder.is(`${ATTR}.case_id`, caseId),
        perPage: 0,
        aggs: { byTask: { terms: { field: `${ATTR}.task_id`, size: MAX_TASKS_PER_CASE } } },
      });
      return Object.fromEntries(
        (result.aggregations?.byTask.buckets ?? []).map(({ key, doc_count: count }) => [key, count])
      );
    } catch (error) {
      throw createCaseError({
        message: `Failed to count task comments for case ${caseId}: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }

  public async delete(commentId: string, { refresh }: IndexRefresh = {}): Promise<void> {
    try {
      await this.deps.unsecuredSavedObjectsClient.delete(
        CASE_TASK_COMMENT_SAVED_OBJECT,
        commentId,
        {
          refresh,
        }
      );
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete task comment ${commentId}: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }

  /** Removes the comments of the given tasks, or of a whole case. Used by the cascade deletes. */
  public async deleteBy(filter: { taskIds: string[] } | { caseId: string }): Promise<void> {
    try {
      const node =
        'caseId' in filter
          ? nodeBuilder.is(`${ATTR}.case_id`, filter.caseId)
          : nodeBuilder.or(filter.taskIds.map((id) => nodeBuilder.is(`${ATTR}.task_id`, id)));
      if (!('caseId' in filter) && filter.taskIds.length === 0) {
        return;
      }

      const result = await this.deps.unsecuredSavedObjectsClient.find<CaseTaskCommentAttributes>({
        type: CASE_TASK_COMMENT_SAVED_OBJECT,
        filter: node,
        perPage: MAX_COMMENTS_PER_TASK * MAX_TASKS_PER_CASE,
        fields: [],
      });
      if (result.saved_objects.length === 0) {
        return;
      }
      await this.deps.unsecuredSavedObjectsClient.bulkDelete(
        result.saved_objects.map(({ id }) => ({ type: CASE_TASK_COMMENT_SAVED_OBJECT, id }))
      );
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete task comments: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }
}
