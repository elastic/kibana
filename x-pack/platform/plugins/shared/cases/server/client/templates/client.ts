/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { chunk } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { fromKueryExpression, nodeBuilder } from '@kbn/es-query';
import type { KueryNode } from '@kbn/es-query';
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
import {
  CASE_SAVED_OBJECT,
  MAX_CASES_TO_UPDATE,
  MAX_TEMPLATE_USAGE_CASES_LISTED,
  MAX_TEMPLATES_PER_OWNER,
} from '../../../common/constants';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import { Operations } from '../../authorization';

/** Cases referencing a set of templates — powers the delete-confirmation dialog. */
export interface TemplateUsage {
  total: number;
  cases: Array<{ id: string; title: string }>;
}

/** KQL matching cases whose applied template is any of `templateIds`. */
const casesUsingTemplatesFilter = (templateIds: string[]): KueryNode =>
  nodeBuilder.or(
    templateIds.map((id) =>
      fromKueryExpression(`${CASE_SAVED_OBJECT}.attributes.template.id: "${id}"`)
    )
  );

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
  /** Cases the caller can read that currently apply any of `templateIds` (for delete confirmation). */
  getCasesUsingTemplates(templateIds: string[]): Promise<TemplateUsage>;
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
    const filter = casesUsingTemplatesFilter([templateId]);

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

      // Cap live templates per owner to prevent unbounded growth. Counts latest, non-deleted
      // templates only, so deleting frees capacity. Space scoping is implicit (namespaced client).
      const existing = await templatesService.getAllTemplates({
        page: 1,
        perPage: 1,
        sortField: 'name',
        sortOrder: 'asc',
        search: '',
        tags: [],
        author: [],
        owner: [input.owner],
        isDeleted: false,
      });
      if (existing.total >= MAX_TEMPLATES_PER_OWNER) {
        throw Boom.badRequest(
          `Cannot create more than ${MAX_TEMPLATES_PER_OWNER} templates per owner.`
        );
      }

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

    getCasesUsingTemplates: async (templateIds: string[]): Promise<TemplateUsage> => {
      if (templateIds.length === 0) {
        return { total: 0, cases: [] };
      }

      // Scope to cases the caller can read so the confirmation dialog never leaks titles across owners.
      const { filter: authFilter } = await authorization.getAuthorizationFilter(
        Operations.findCases
      );
      const templateFilter = casesUsingTemplatesFilter(templateIds);
      const filter = authFilter ? nodeBuilder.and([authFilter, templateFilter]) : templateFilter;

      const found = await caseService.findCases({
        filter,
        page: 1,
        perPage: MAX_TEMPLATE_USAGE_CASES_LISTED,
      });

      return {
        total: found.total,
        cases: found.saved_objects.map((so) => ({ id: so.id, title: so.attributes.title })),
      };
    },

    getTags: () => templatesService.getTags(),

    getAuthors: () => templatesService.getAuthors(),
  };

  return Object.freeze(templatesSubClient);
};
