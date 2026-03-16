/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder } from '@kbn/es-query';
import {
  CASE_TASK_TEMPLATE_SAVED_OBJECT,
  MAX_TASK_TEMPLATES_PER_OWNER,
} from '../../../common/constants';
import type {
  CaseTaskTemplate,
  CaseTaskTemplateAttributes,
} from '../../../common/types/domain/task_template/v1';
import { createCaseError } from '../../common/error';
import type { CreateTemplateArgs, FindTemplatesArgs, UpdateTemplateArgs } from './types';

const ATTR = `${CASE_TASK_TEMPLATE_SAVED_OBJECT}.attributes`;

const toTemplate = (so: SavedObject<CaseTaskTemplateAttributes>): CaseTaskTemplate => ({
  ...so.attributes,
  id: so.id,
  version: so.version ?? '',
});

export class CaseTaskTemplateService {
  constructor(
    private readonly deps: {
      log: Logger;
      unsecuredSavedObjectsClient: SavedObjectsClientContract;
    }
  ) {}

  public async createTemplate({
    name,
    description = '',
    tags = [],
    tasks,
    owner,
    user,
    refresh,
  }: CreateTemplateArgs): Promise<CaseTaskTemplate> {
    try {
      const so = await this.deps.unsecuredSavedObjectsClient.create<CaseTaskTemplateAttributes>(
        CASE_TASK_TEMPLATE_SAVED_OBJECT,
        {
          name,
          description,
          tags,
          tasks,
          owner,
          created_at: new Date().toISOString(),
          created_by: user,
          updated_at: null,
          updated_by: null,
        },
        { refresh }
      );
      return toTemplate(so);
    } catch (error) {
      throw createCaseError({
        message: `Failed to create task template: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }

  public async getTemplate(templateId: string): Promise<CaseTaskTemplate> {
    try {
      const so = await this.deps.unsecuredSavedObjectsClient.get<CaseTaskTemplateAttributes>(
        CASE_TASK_TEMPLATE_SAVED_OBJECT,
        templateId
      );
      return toTemplate(so);
    } catch (error) {
      throw createCaseError({
        message: `Failed to get task template ${templateId}: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }

  public async findTemplates({
    owners,
    tags,
    search,
    page = 1,
    perPage = MAX_TASK_TEMPLATES_PER_OWNER,
  }: FindTemplatesArgs): Promise<{ templates: CaseTaskTemplate[]; total: number }> {
    try {
      const filters: KueryNode[] = [];
      if (owners?.length) {
        filters.push(nodeBuilder.or(owners.map((o) => nodeBuilder.is(`${ATTR}.owner`, o))));
      }
      if (tags?.length) {
        filters.push(nodeBuilder.or(tags.map((t) => nodeBuilder.is(`${ATTR}.tags`, t))));
      }

      const result = await this.deps.unsecuredSavedObjectsClient.find<CaseTaskTemplateAttributes>({
        type: CASE_TASK_TEMPLATE_SAVED_OBJECT,
        filter: filters.length > 0 ? nodeBuilder.and(filters) : undefined,
        search,
        searchFields: search ? ['name', 'description'] : undefined,
        sortField: 'name',
        sortOrder: 'asc',
        page,
        perPage: Math.min(perPage, MAX_TASK_TEMPLATES_PER_OWNER),
      });

      return { templates: result.saved_objects.map(toTemplate), total: result.total };
    } catch (error) {
      throw createCaseError({
        message: `Failed to find task templates: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }

  public async updateTemplate({
    templateId,
    version,
    user,
    refresh,
    ...patch
  }: UpdateTemplateArgs): Promise<CaseTaskTemplate> {
    try {
      const existing = await this.getTemplate(templateId);
      const updated: Partial<CaseTaskTemplateAttributes> = {
        ...patch,
        updated_at: new Date().toISOString(),
        updated_by: user,
      };
      const so = await this.deps.unsecuredSavedObjectsClient.update<CaseTaskTemplateAttributes>(
        CASE_TASK_TEMPLATE_SAVED_OBJECT,
        templateId,
        updated,
        { version, refresh }
      );
      return { ...existing, ...updated, version: so.version ?? existing.version };
    } catch (error) {
      throw createCaseError({
        message: `Failed to update task template ${templateId}: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }

  public async deleteTemplate(templateId: string): Promise<void> {
    try {
      await this.deps.unsecuredSavedObjectsClient.delete(
        CASE_TASK_TEMPLATE_SAVED_OBJECT,
        templateId
      );
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete task template ${templateId}: ${error}`,
        error,
        logger: this.deps.log,
      });
    }
  }
}
