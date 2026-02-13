/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

/**
 * API for interacting with templates.
 */
export interface TemplatesSubClient {
  getAllTemplates(params: TemplatesFindRequest): Promise<TemplatesFindResponse>;
  getTemplate(templateId: string, version?: string): Promise<SavedObject<Template> | undefined>;
  createTemplate(input: CreateTemplateInput): Promise<SavedObject<Template>>;
  updateTemplate(templateId: string, input: UpdateTemplateInput): Promise<SavedObject<Template>>;
  deleteTemplate(templateId: string): Promise<void>;
}

/**
 * Creates the interface for templates.
 *
 * @ignore
 */
export const createTemplatesSubClient = (clientArgs: CasesClientArgs): TemplatesSubClient => {
  const { templatesService } = clientArgs.services;

  const templatesSubClient: TemplatesSubClient = {
    getAllTemplates: (params: TemplatesFindRequest) => templatesService.getAllTemplates(params),
    getTemplate: (templateId: string, version?: string) =>
      templatesService.getTemplate(templateId, version),
    createTemplate: (input: CreateTemplateInput) => templatesService.createTemplate(input),
    updateTemplate: (templateId: string, input: UpdateTemplateInput) =>
      templatesService.updateTemplate(templateId, input),
    deleteTemplate: (templateId: string) => templatesService.deleteTemplate(templateId),
  };

  return Object.freeze(templatesSubClient);
};
