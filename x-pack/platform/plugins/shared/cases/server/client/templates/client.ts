/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { chunk } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { fromKueryExpression } from '@kbn/es-query';
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
import { CASE_SAVED_OBJECT, MAX_CASES_TO_UPDATE } from '../../../common/constants';
import type { CasesClient } from '../client';
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
  getTags(): Promise<string[]>;
  getAuthors(): Promise<string[]>;
}

/**
 * Creates the interface for templates.
 *
 * @ignore
 */
export const createTemplatesSubClient = (
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): TemplatesSubClient => {
  const { services, authorization, user } = clientArgs;
  const { templatesService, caseService } = services;

  /**
   * Unlinks every case in the current space that references `templateId`: clears `template` while
   * KEEPING each case's `extended_fields` values. Routed through `cases.bulkUpdate` so each unlink is
   * authorized and recorded as a user action. Field values persist on the record (they reappear if a
   * template that defines them is re-applied) — deletion must never make a case un-editable.
   */
  const unlinkCasesFromTemplate = async (templateId: string): Promise<void> => {
    const filter = fromKueryExpression(
      `${CASE_SAVED_OBJECT}.attributes.template.id: "${templateId}"`
    );

    // Snapshot all referencing cases up front (id + version) so a single pass unlinks them without
    // re-querying freshly-mutated documents.
    const affected: Array<{ id: string; version: string }> = [];
    const first = await caseService.findCases({ filter, page: 1, perPage: MAX_CASES_TO_UPDATE });
    const collect = (sos: Array<{ id: string; version?: string }>) => {
      for (const so of sos) {
        affected.push({ id: so.id, version: so.version ?? '' });
      }
    };
    collect(first.saved_objects);
    const totalPages = Math.ceil(first.total / MAX_CASES_TO_UPDATE);
    for (let page = 2; page <= totalPages; page++) {
      const next = await caseService.findCases({ filter, page, perPage: MAX_CASES_TO_UPDATE });
      collect(next.saved_objects);
    }

    if (affected.length === 0) {
      return;
    }

    // bulkUpdate caps at MAX_CASES_TO_UPDATE per request.
    for (const batch of chunk(affected, MAX_CASES_TO_UPDATE)) {
      await casesClient.cases.bulkUpdate({
        cases: batch.map(({ id, version }) => ({ id, version, template: null })),
      });
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
      await authorization.ensureAuthorized({
        operation: Operations.manageTemplate,
        entities: [{ owner: template.attributes.owner, id: template.id }],
      });
      return templatesService.updateTemplate(templateId, input);
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
      // Unlink referencing cases before soft-deleting so no case is left pointing at a missing
      // template. Values are preserved (see unlinkCasesFromTemplate).
      await unlinkCasesFromTemplate(templateId);
      return templatesService.deleteTemplate(templateId);
    },

    getTags: () => templatesService.getTags(),

    getAuthors: () => templatesService.getAuthors(),
  };

  return Object.freeze(templatesSubClient);
};
