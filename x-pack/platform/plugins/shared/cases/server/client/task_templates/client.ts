/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { MAX_TASK_TEMPLATES_PER_OWNER } from '../../../common/constants';
import type {
  TaskTemplateCreateRequest,
  TaskTemplatePatchRequest,
  TaskTemplatesFindRequest,
  TaskTemplatesResponse,
} from '../../../common/types/api/task/v1';
import {
  TaskTemplateCreateRequestRt,
  TaskTemplatePatchRequestRt,
  TaskTemplatesFindRequestRt,
} from '../../../common/types/api/task/v1';
import type { CaseTaskTemplate } from '../../../common/types/domain/task_template/v1';
import { Operations, ReadOperations, WriteOperations } from '../../authorization';
import { LICENSING_CASE_TASKS_FEATURE } from '../../common/constants';
import { createCaseError } from '../../common/error';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import type { CasesClientArgs } from '../types';

/** Reusable task lists, managed with the cases settings privilege. */
export interface TaskTemplatesSubClient {
  create(params: TaskTemplateCreateRequest): Promise<CaseTaskTemplate>;
  get(templateId: string): Promise<CaseTaskTemplate>;
  find(params: TaskTemplatesFindRequest): Promise<TaskTemplatesResponse>;
  update(templateId: string, params: TaskTemplatePatchRequest): Promise<CaseTaskTemplate>;
  delete(templateId: string): Promise<void>;
}

const asArray = <T>(value: T | T[] | undefined): T[] | undefined =>
  value === undefined ? undefined : Array.isArray(value) ? value : [value];

export const createTaskTemplatesSubClient = (
  clientArgs: CasesClientArgs
): TaskTemplatesSubClient => {
  const {
    services: { taskTemplateService, licensingService },
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
        'In order to use case task lists, you must be subscribed to an Elastic Platinum license'
      );
    }
    licensingService.notifyUsage(LICENSING_CASE_TASKS_FEATURE);
  };

  const getAuthorizedTemplate = async (
    templateId: string,
    operation: ReadOperations | WriteOperations
  ) => {
    const template = await taskTemplateService.getTemplate(templateId);
    await authorization.ensureAuthorized({
      operation: Operations[operation],
      entities: [{ id: template.id, owner: template.owner }],
    });
    return template;
  };

  return Object.freeze<TaskTemplatesSubClient>({
    async create(params) {
      try {
        await ensureEnabled();
        const request = decodeWithExcessOrThrow(TaskTemplateCreateRequestRt)(params);
        await authorization.ensureAuthorized({
          operation: Operations[WriteOperations.CreateTaskTemplate],
          entities: [{ id: request.owner, owner: request.owner }],
        });

        const { total } = await taskTemplateService.findTemplates({
          owners: [request.owner],
          perPage: 1,
        });
        if (total >= MAX_TASK_TEMPLATES_PER_OWNER) {
          throw Boom.badRequest(
            `At most ${MAX_TASK_TEMPLATES_PER_OWNER} task lists can be created per solution`
          );
        }

        return await taskTemplateService.createTemplate({ ...request, user, refresh: 'wait_for' });
      } catch (error) {
        throw createCaseError({ message: `Failed to create task list: ${error}`, error, logger });
      }
    },

    async get(templateId) {
      try {
        await ensureEnabled();
        return await getAuthorizedTemplate(templateId, ReadOperations.GetTaskTemplate);
      } catch (error) {
        throw createCaseError({
          message: `Failed to get task list ${templateId}: ${error}`,
          error,
          logger,
        });
      }
    },

    async find(params) {
      try {
        await ensureEnabled();
        const request = decodeWithExcessOrThrow(TaskTemplatesFindRequestRt)(params);
        const { authorizedOwners } = await authorization.getAuthorizationFilter(
          Operations[ReadOperations.FindTaskTemplates]
        );

        // authorizedOwners is undefined when security is disabled.
        const requested = asArray(request.owner);
        const owners = !authorizedOwners
          ? requested
          : requested?.filter((o) => authorizedOwners.includes(o)) ?? authorizedOwners;

        if (owners?.length === 0) {
          return { templates: [], total: 0 };
        }

        return await taskTemplateService.findTemplates({
          owners,
          tags: asArray(request.tags),
          search: request.search,
        });
      } catch (error) {
        throw createCaseError({ message: `Failed to find task lists: ${error}`, error, logger });
      }
    },

    async update(templateId, params) {
      try {
        await ensureEnabled();
        const { version, ...patch } = decodeWithExcessOrThrow(TaskTemplatePatchRequestRt)(params);
        await getAuthorizedTemplate(templateId, WriteOperations.UpdateTaskTemplate);
        return await taskTemplateService.updateTemplate({
          ...patch,
          templateId,
          version,
          user,
          refresh: 'wait_for',
        });
      } catch (error) {
        throw createCaseError({
          message: `Failed to update task list ${templateId}: ${error}`,
          error,
          logger,
        });
      }
    },

    async delete(templateId) {
      try {
        await ensureEnabled();
        await getAuthorizedTemplate(templateId, WriteOperations.DeleteTaskTemplate);
        await taskTemplateService.deleteTemplate(templateId);
      } catch (error) {
        throw createCaseError({
          message: `Failed to delete task list ${templateId}: ${error}`,
          error,
          logger,
        });
      }
    },
  });
};
