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
  getTemplate(
    templateId: string,
    version?: string,
    options?: { includeDeleted?: boolean }
  ): Promise<SavedObject<Template> | undefined>;
  createTemplate(input: CreateTemplateInput): Promise<SavedObject<Template>>;
  updateTemplate(templateId: string, input: UpdateTemplateInput): Promise<SavedObject<Template>>;
  deleteTemplate(templateId: string): Promise<void>;
  /**
   * Write preflight (`dry_run`): runs the same authorization and name-uniqueness checks a
   * `createTemplate` would, without writing. Throws exactly what the real write would throw.
   */
  validateCreateTemplate(input: CreateTemplateInput): Promise<void>;
  /** Write preflight (`dry_run`) for `updateTemplate` — see {@link validateCreateTemplate}. */
  validateUpdateTemplate(templateId: string, input: UpdateTemplateInput): Promise<void>;
  getTags(): Promise<string[]>;
  getAuthors(): Promise<string[]>;
}

/**
 * Creates the interface for templates.
 *
 * @ignore
 */
export const createTemplatesSubClient = (clientArgs: CasesClientArgs): TemplatesSubClient => {
  const { services, authorization, user } = clientArgs;
  const { templatesService } = services;

  /**
   * Moving a template to a different owner also requires manage rights on the TARGET owner —
   * otherwise a solution-scoped user could plant templates into another solution's scope.
   * Shared by `updateTemplate` and its `dry_run` preflight so both throw identically.
   */
  const ensureCanManageTargetOwner = async (
    template: SavedObject<Template>,
    input: UpdateTemplateInput
  ) => {
    if (input.owner !== template.attributes.owner) {
      await authorization.ensureAuthorized({
        operation: Operations.manageTemplate,
        entities: [{ owner: input.owner, id: template.id }],
      });
    }
  };

  /**
   * Authorizes a mutation on an existing template without becoming an existence oracle: a user
   * with no template-read access for the owner gets the same 404 as a missing id, while a user
   * who can read (but not manage) templates gets an honest 403.
   *
   * Takes the request `templateId` (not `template.attributes.templateId`) so the hide-existence 404
   * is byte-identical to the missing-id 404 the callers throw — the two must be indistinguishable.
   */
  const ensureCanManageOrHideExistence = async (
    template: SavedObject<Template>,
    templateId: string
  ) => {
    const entities = [{ owner: template.attributes.owner, id: template.id }];
    try {
      await authorization.ensureAuthorized({
        operation: Operations.manageTemplate,
        entities,
      });
    } catch (manageError) {
      try {
        await authorization.ensureAuthorized({
          operation: Operations.getTemplate,
          entities,
        });
      } catch {
        throw Boom.notFound(`Template with id ${templateId} not found`);
      }
      throw manageError;
    }
  };

  const templatesSubClient: TemplatesSubClient = {
    getAllTemplates: async (params: TemplatesFindRequest) => {
      const { authorizedOwners } = await authorization.getAuthorizationFilter(
        Operations.findTemplates
      );

      // authorizedOwners is undefined when security is disabled, so no owner restriction applies.
      if (!authorizedOwners) {
        return templatesService.getAllTemplates(params);
      }

      const owner =
        params.owner.length > 0
          ? params.owner.filter((requestedOwner) => authorizedOwners.includes(requestedOwner))
          : authorizedOwners;

      if (owner.length === 0) {
        return { templates: [], page: params.page, perPage: params.perPage, total: 0 };
      }

      return templatesService.getAllTemplates({ ...params, owner });
    },

    getTemplate: async (
      templateId: string,
      version?: string,
      options?: { includeDeleted?: boolean }
    ) => {
      const template = await templatesService.getTemplate(templateId, version, options);
      if (!template) {
        return undefined;
      }

      await authorization.ensureAuthorized({
        operation: Operations.getTemplate,
        entities: [{ owner: template.attributes.owner, id: template.id }],
      });

      return template;
    },

    createTemplate: async (input: CreateTemplateInput) => {
      const id = uuidv4();
      await authorization.ensureAuthorized({
        operation: Operations.manageTemplate,
        entities: [{ owner: input.owner, id }],
      });
      return templatesService.createTemplate(input, user.username ?? 'unknown', id);
    },

    updateTemplate: async (templateId: string, input: UpdateTemplateInput) => {
      const template = await templatesService.getTemplate(templateId);
      if (!template) {
        throw Boom.notFound(`Template with id ${templateId} not found`);
      }
      await ensureCanManageOrHideExistence(template, templateId);
      await ensureCanManageTargetOwner(template, input);
      return templatesService.updateTemplate(templateId, input);
    },

    deleteTemplate: async (templateId: string) => {
      const template = await templatesService.getTemplate(templateId);
      if (!template) {
        throw Boom.notFound(`Template with id ${templateId} not found`);
      }
      await ensureCanManageOrHideExistence(template, templateId);
      return templatesService.deleteTemplate(templateId);
    },

    validateCreateTemplate: async (input: CreateTemplateInput) => {
      await authorization.ensureAuthorized({
        operation: Operations.manageTemplate,
        entities: [{ owner: input.owner, id: uuidv4() }],
      });
      await templatesService.validateWriteInput(input);
    },

    validateUpdateTemplate: async (templateId: string, input: UpdateTemplateInput) => {
      const template = await templatesService.getTemplate(templateId);
      if (!template) {
        throw Boom.notFound(`Template with id ${templateId} not found`);
      }
      await ensureCanManageOrHideExistence(template, templateId);
      await ensureCanManageTargetOwner(template, input);
      await templatesService.validateWriteInput(input, {
        excludeTemplateId: template.attributes.templateId,
        currentOwner: template.attributes.owner,
      });
    },

    getTags: () => templatesService.getTags(),

    getAuthors: () => templatesService.getAuthors(),
  };

  return Object.freeze(templatesSubClient);
};
