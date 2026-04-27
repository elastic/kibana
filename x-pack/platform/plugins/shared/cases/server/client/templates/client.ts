/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { v4 as uuidv4 } from 'uuid';
import type { SavedObject } from '@kbn/core/server';
import type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '../../../common/types/domain/template/latest';
import type {
  TemplatesFindRequest,
  TemplatesFindResponse,
} from '../../../common/types/api/template/v1';
import type { CasesClientArgs } from '../types';
import { Operations } from '../../authorization';

/**
 * API for interacting with templates.
 */
export interface TemplatesSubClient {
  getAllTemplates(params: TemplatesFindRequest): Promise<TemplatesFindResponse>;
  getTemplate(templateId: string, version?: string): Promise<SavedObject<Template> | undefined>;
  createTemplate(input: CreateTemplateInput): Promise<SavedObject<Template>>;
  updateTemplate(templateId: string, input: UpdateTemplateInput): Promise<SavedObject<Template>>;
  deleteTemplate(templateId: string): Promise<void>;
  getTags(): Promise<string[]>;
  getAuthors(): Promise<string[]>;
}

/**
 * Creates the interface for templates.
 *
 * @ignore
 */
export const createTemplatesSubClient = (clientArgs: CasesClientArgs): TemplatesSubClient => {
  const { services, authorization, user, getViewSyncService } = clientArgs;
  const { templatesService } = services;

  /*
   * Fire-and-forget regeneration trigger. Called after each successful
   * template write. The view sync service debounces bursts (~30s) and is
   * single-flight, so a flurry of bulk template writes still produces at
   * most one regenerate per quiet window. In indices mode (no view sync
   * service) this is a no-op.
   */
  const scheduleViewRegen = () => {
    getViewSyncService?.()?.scheduleRegeneration();
  };

  const templatesSubClient: TemplatesSubClient = {
    getAllTemplates: (params: TemplatesFindRequest) => templatesService.getAllTemplates(params),

    getTemplate: (templateId: string, version?: string) =>
      templatesService.getTemplate(templateId, version),

    createTemplate: async (input: CreateTemplateInput) => {
      const id = uuidv4();
      await authorization.ensureAuthorized({
        operation: Operations.manageTemplate,
        entities: [{ owner: input.owner, id }],
      });
      const created = await templatesService.createTemplate(input, user.username ?? 'unknown', id);
      scheduleViewRegen();
      return created;
    },

    updateTemplate: async (templateId: string, input: UpdateTemplateInput) => {
      const template = await templatesService.getTemplate(templateId);
      if (!template) {
        throw Boom.notFound(`Template with id ${templateId} not found`);
      }
      await authorization.ensureAuthorized({
        operation: Operations.manageTemplate,
        entities: [{ owner: template.attributes.owner, id: template.id }],
      });
      const updated = await templatesService.updateTemplate(templateId, input);
      scheduleViewRegen();
      return updated;
    },

    deleteTemplate: async (templateId: string) => {
      const template = await templatesService.getTemplate(templateId);
      if (!template) {
        throw Boom.notFound(`Template with id ${templateId} not found`);
      }
      await authorization.ensureAuthorized({
        operation: Operations.manageTemplate,
        entities: [{ owner: template.attributes.owner, id: template.id }],
      });
      await templatesService.deleteTemplate(templateId);
      scheduleViewRegen();
    },

    getTags: () => templatesService.getTags(),

    getAuthors: () => templatesService.getAuthors(),
  };

  return Object.freeze(templatesSubClient);
};
