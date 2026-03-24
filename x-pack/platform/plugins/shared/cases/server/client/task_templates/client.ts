/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type {
  CaseTaskTemplate,
  CaseTaskTemplateTask,
} from '../../../common/types/domain/task_template/v1';
import { createCaseError } from '../../common/error';
import { Operations, ReadOperations, WriteOperations } from '../../authorization';
import type { CasesClientArgs } from '../types';

export interface CreateTaskTemplateParams {
  name: string;
  description?: string;
  scope?: 'global' | 'space';
  tags?: string[];
  tasks: CaseTaskTemplateTask[];
  owner: string;
}

export interface UpdateTaskTemplateParams {
  templateId: string;
  version: string;
  name?: string;
  description?: string;
  scope?: 'global' | 'space';
  tags?: string[];
  tasks?: CaseTaskTemplateTask[];
}

export interface FindTaskTemplatesParams {
  scope?: 'global' | 'space';
  tags?: string[];
  owners?: string[];
  search?: string;
  page?: number;
  per_page?: number;
}

export interface TaskTemplatesSubClient {
  create(params: CreateTaskTemplateParams): Promise<CaseTaskTemplate>;
  get(templateId: string): Promise<CaseTaskTemplate>;
  find(params: FindTaskTemplatesParams): Promise<{ templates: CaseTaskTemplate[]; total: number }>;
  update(params: UpdateTaskTemplateParams): Promise<CaseTaskTemplate>;
  delete(templateId: string): Promise<void>;
}

export const createTaskTemplatesSubClient = (
  clientArgs: CasesClientArgs
): TaskTemplatesSubClient => {
  const {
    services: { taskTemplateService },
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

  const taskTemplatesSubClient: TaskTemplatesSubClient = {
    async create(params: CreateTaskTemplateParams): Promise<CaseTaskTemplate> {
      assertTasksEnabled();
      try {
        await authorization.ensureAuthorized({
          operation: Operations[WriteOperations.CreateTaskTemplate],
          entities: [{ owner: params.owner, id: params.owner }],
        });

        return taskTemplateService.createTemplate({ ...params, user });
      } catch (error) {
        throw createCaseError({
          message: `Failed to create task template: ${error}`,
          error,
          logger,
        });
      }
    },

    async get(templateId: string): Promise<CaseTaskTemplate> {
      assertTasksEnabled();
      try {
        const template = await taskTemplateService.getTemplate(templateId);

        await authorization.ensureAuthorized({
          operation: Operations[ReadOperations.GetTaskTemplate],
          entities: [{ owner: template.owner, id: templateId }],
        });

        return template;
      } catch (error) {
        throw createCaseError({
          message: `Failed to get task template ${templateId}: ${error}`,
          error,
          logger,
        });
      }
    },

    async find(
      params: FindTaskTemplatesParams
    ): Promise<{ templates: CaseTaskTemplate[]; total: number }> {
      assertTasksEnabled();
      try {
        const { ensureSavedObjectsAreAuthorized } = await authorization.getAuthorizationFilter(
          Operations[ReadOperations.FindTaskTemplates]
        );

        const result = await taskTemplateService.findTemplates(params);

        ensureSavedObjectsAreAuthorized(
          result.templates.map((t) => ({ owner: t.owner, id: t.id }))
        );

        return result;
      } catch (error) {
        throw createCaseError({
          message: `Failed to find task templates: ${error}`,
          error,
          logger,
        });
      }
    },

    async update(params: UpdateTaskTemplateParams): Promise<CaseTaskTemplate> {
      assertTasksEnabled();
      try {
        const existing = await taskTemplateService.getTemplate(params.templateId);

        await authorization.ensureAuthorized({
          operation: Operations[WriteOperations.UpdateTaskTemplate],
          entities: [{ owner: existing.owner, id: params.templateId }],
        });

        return taskTemplateService.updateTemplate({ ...params, user });
      } catch (error) {
        throw createCaseError({
          message: `Failed to update task template ${params.templateId}: ${error}`,
          error,
          logger,
        });
      }
    },

    async delete(templateId: string): Promise<void> {
      assertTasksEnabled();
      try {
        const template = await taskTemplateService.getTemplate(templateId);

        await authorization.ensureAuthorized({
          operation: Operations[WriteOperations.DeleteTaskTemplate],
          entities: [{ owner: template.owner, id: templateId }],
        });

        return taskTemplateService.deleteTemplate(templateId);
      } catch (error) {
        throw createCaseError({
          message: `Failed to delete task template ${templateId}: ${error}`,
          error,
          logger,
        });
      }
    },
  };

  return Object.freeze(taskTemplatesSubClient);
};
