/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';
import { CASE_TASK_TEMPLATE_SAVED_OBJECT } from '../../../common/constants';
import type {
  CaseTaskTemplate,
  CaseTaskTemplateAttributes,
} from '../../../common/types/domain/task_template/v1';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import { createCaseError } from '../../common/error';
import { CaseTaskService } from '../tasks';
import type {
  CreateTemplateArgs,
  UpdateTemplateArgs,
  FindTemplatesArgs,
  ApplyTemplateArgs,
} from './types';

const CACHE_TTL_MS = 60_000;

export class CaseTaskTemplateService {
  private readonly log: Logger;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  private readonly taskService: CaseTaskService;
  /** Simple in-process LRU-like cache (60 s TTL) for template definitions. */
  private readonly templateCache = new Map<string, { template: CaseTaskTemplate; expiresAt: number }>();

  constructor({
    log,
    unsecuredSavedObjectsClient,
  }: {
    log: Logger;
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
  }) {
    this.log = log;
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.taskService = new CaseTaskService({ log, unsecuredSavedObjectsClient });
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  public async createTemplate(args: CreateTemplateArgs): Promise<CaseTaskTemplate> {
    const {
      name,
      description = '',
      scope = 'space',
      tags = [],
      tasks,
      owner,
      user,
      refresh,
    } = args;

    try {
      const now = new Date().toISOString();

      const attributes: CaseTaskTemplateAttributes = {
        name,
        description,
        scope,
        tags,
        tasks,
        owner,
        created_at: now,
        created_by: user,
        updated_at: null,
        updated_by: null,
      };

      const so = await this.unsecuredSavedObjectsClient.create<CaseTaskTemplateAttributes>(
        CASE_TASK_TEMPLATE_SAVED_OBJECT,
        attributes,
        { refresh }
      );

      return this.transformToTemplate(so);
    } catch (error) {
      throw createCaseError({
        message: `Failed to create task template: ${error}`,
        error,
        logger: this.log,
      });
    }
  }

  public async getTemplate(templateId: string): Promise<CaseTaskTemplate> {
    const cached = this.templateCache.get(templateId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.template;
    }

    try {
      const so = await this.unsecuredSavedObjectsClient.get<CaseTaskTemplateAttributes>(
        CASE_TASK_TEMPLATE_SAVED_OBJECT,
        templateId
      );
      const template = this.transformToTemplate(so);
      this.templateCache.set(templateId, { template, expiresAt: Date.now() + CACHE_TTL_MS });
      return template;
    } catch (error) {
      throw createCaseError({
        message: `Failed to get task template ${templateId}: ${error}`,
        error,
        logger: this.log,
      });
    }
  }

  public async findTemplates(
    args: FindTemplatesArgs
  ): Promise<{ templates: CaseTaskTemplate[]; total: number }> {
    const { scope, tags, owners, search, page = 1, per_page = 50 } = args;

    try {
      const filters = [];

      if (scope) {
        filters.push(
          nodeBuilder.is(`${CASE_TASK_TEMPLATE_SAVED_OBJECT}.attributes.scope`, scope)
        );
      }
      if (owners && owners.length > 0) {
        filters.push(
          nodeBuilder.or(
            owners.map((o) =>
              nodeBuilder.is(`${CASE_TASK_TEMPLATE_SAVED_OBJECT}.attributes.owner`, o)
            )
          )
        );
      }
      if (tags && tags.length > 0) {
        filters.push(
          nodeBuilder.or(
            tags.map((t) =>
              nodeBuilder.is(`${CASE_TASK_TEMPLATE_SAVED_OBJECT}.attributes.tags`, t)
            )
          )
        );
      }

      const result = await this.unsecuredSavedObjectsClient.find<CaseTaskTemplateAttributes>({
        type: CASE_TASK_TEMPLATE_SAVED_OBJECT,
        filter: filters.length > 0 ? nodeBuilder.and(filters) : undefined,
        search: search ?? undefined,
        searchFields: search ? ['name', 'description'] : undefined,
        page,
        perPage: Math.min(per_page, 200),
      });

      return {
        templates: result.saved_objects.map((so) => this.transformToTemplate(so)),
        total: result.total,
      };
    } catch (error) {
      throw createCaseError({
        message: `Failed to find task templates: ${error}`,
        error,
        logger: this.log,
      });
    }
  }

  public async updateTemplate(args: UpdateTemplateArgs): Promise<CaseTaskTemplate> {
    const { templateId, version, user, refresh, ...patch } = args;

    try {
      const now = new Date().toISOString();

      const updatedAttributes: Partial<CaseTaskTemplateAttributes> = {
        ...patch,
        updated_at: now,
        updated_by: user,
      };

      await this.unsecuredSavedObjectsClient.update<CaseTaskTemplateAttributes>(
        CASE_TASK_TEMPLATE_SAVED_OBJECT,
        templateId,
        updatedAttributes,
        { version, refresh }
      );

      // Invalidate cache
      this.templateCache.delete(templateId);

      return this.getTemplate(templateId);
    } catch (error) {
      throw createCaseError({
        message: `Failed to update task template ${templateId}: ${error}`,
        error,
        logger: this.log,
      });
    }
  }

  public async deleteTemplate(templateId: string): Promise<void> {
    try {
      await this.unsecuredSavedObjectsClient.delete(CASE_TASK_TEMPLATE_SAVED_OBJECT, templateId);
      this.templateCache.delete(templateId);
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete task template ${templateId}: ${error}`,
        error,
        logger: this.log,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Apply
  // ---------------------------------------------------------------------------

  public async applyTemplate(args: ApplyTemplateArgs): Promise<CaseTask[]> {
    const { templateId, caseId, owner, user, due_date_anchor, refresh } = args;

    try {
      const template = await this.getTemplate(templateId);
      const anchorDate = due_date_anchor ? new Date(due_date_anchor) : new Date();

      const computeDueDate = (relativeDays: number | null): string | null => {
        if (relativeDays === null) return null;
        const d = new Date(anchorDate);
        d.setDate(d.getDate() + relativeDays);
        return d.toISOString();
      };

      // Create root tasks in bulk
      const rootTaskArgs = template.tasks.map((t) => ({
        caseId,
        title: t.title,
        description: t.description,
        priority: t.priority,
        due_date: computeDueDate(t.relative_due_days),
        sort_order: t.sort_order,
        template_id: templateId,
        owner,
        user,
      }));

      const rootTasks = await this.taskService.bulkCreateTasks({
        tasks: rootTaskArgs,
        refresh,
      });

      // Create subtasks in bulk, mapping root task sort_order → created task ID
      const rootIdByIndex = new Map(rootTasks.map((t, i) => [i, t.id]));
      const subtaskArgs = template.tasks.flatMap((t, i) =>
        t.subtasks.map((sub) => ({
          caseId,
          title: sub.title,
          description: sub.description,
          priority: sub.priority,
          due_date: computeDueDate(sub.relative_due_days),
          sort_order: sub.sort_order,
          parent_task_id: rootIdByIndex.get(i) ?? null,
          template_id: templateId,
          owner,
          user,
        }))
      );

      const subtasks =
        subtaskArgs.length > 0
          ? await this.taskService.bulkCreateTasks({ tasks: subtaskArgs, refresh })
          : [];

      return [...rootTasks, ...subtasks];
    } catch (error) {
      throw createCaseError({
        message: `Failed to apply template ${templateId} to case ${caseId}: ${error}`,
        error,
        logger: this.log,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private transformToTemplate(
    so: Awaited<ReturnType<SavedObjectsClientContract['get']>>
  ): CaseTaskTemplate {
    return {
      ...(so.attributes as CaseTaskTemplateAttributes),
      id: so.id,
      version: so.version ?? '',
    };
  }
}
