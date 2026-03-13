/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsUtils } from '@kbn/core/server';
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
  const { templatesService } = clientArgs.services;
  const { authorization } = clientArgs;

  const templatesSubClient: TemplatesSubClient = {
    getAllTemplates: async (params: TemplatesFindRequest) => {
      await authorization.getAuthorizationFilter(Operations.GetAllTemplates);
      return templatesService.getAllTemplates(params);
    },

    getTemplate: async (templateId: string, version?: string) => {
      const { ensureSavedObjectsAreAuthorized } = await authorization.getAuthorizationFilter(
        Operations.GetAllTemplates
      );
      const result = await templatesService.getTemplate(templateId, version);
      if (result != null) {
        ensureSavedObjectsAreAuthorized([{ id: result.id, owner: result.attributes.owner }]);
      }
      return result;
    },

    createTemplate: async (input: CreateTemplateInput) => {
      const savedObjectID = SavedObjectsUtils.generateId();
      await authorization.ensureAuthorized({
        operation: Operations.ManageTemplate,
        entities: [{ owner: input.owner, id: savedObjectID }],
      });
      return templatesService.createTemplate(input, clientArgs.user.username ?? 'unknown');
    },

    updateTemplate: async (templateId: string, input: UpdateTemplateInput) => {
      const existing = await templatesService.getTemplate(templateId);
      if (existing == null) {
        throw Boom.notFound(`Template with id ${templateId} does not exist`);
      }
      await authorization.ensureAuthorized({
        operation: Operations.ManageTemplate,
        entities: [{ owner: existing.attributes.owner, id: existing.id }],
      });
      return templatesService.updateTemplate(templateId, input);
    },

    deleteTemplate: async (templateId: string) => {
      const existing = await templatesService.getTemplate(templateId);
      if (existing == null) {
        throw Boom.notFound(`Template with id ${templateId} does not exist`);
      }
      await authorization.ensureAuthorized({
        operation: Operations.ManageTemplate,
        entities: [{ owner: existing.attributes.owner, id: existing.id }],
      });
      return templatesService.deleteTemplate(templateId);
    },

    getTags: async () => {
      await authorization.getAuthorizationFilter(Operations.GetAllTemplates);
      return templatesService.getTags();
    },

    getAuthors: async () => {
      await authorization.getAuthorizationFilter(Operations.GetAllTemplates);
      return templatesService.getAuthors();
    },
  };

  return Object.freeze(templatesSubClient);
};
