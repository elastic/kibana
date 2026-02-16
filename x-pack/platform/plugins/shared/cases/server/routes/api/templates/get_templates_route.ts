/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import type { TemplatesFindRequest } from '../../../../common/types/api';
import { INTERNAL_TEMPLATES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { parseTemplate } from './parse_template';

/**
 * GET /internal/cases/templates
 * List all templates (excluding soft-deleted ones by default)
 */
export const getTemplatesRoute = createCasesRoute<{}, TemplatesFindRequest, {}>({
  method: 'get',
  path: INTERNAL_TEMPLATES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Get all case templates',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const { page, perPage, sortField, sortOrder, search, tags, author, isDeleted } =
        request.query;
      const { templates, ...pagination } = await casesClient.templates.getAllTemplates({
        page: Number(page),
        perPage: Number(perPage),
        sortField,
        sortOrder,
        search,
        tags: tags ? castArray(tags).filter(Boolean) : [],
        author: author ? castArray(author).filter(Boolean) : [],
        isDeleted: String(isDeleted) === 'true',
      });

      return response.ok({
        body: {
          ...pagination,
          templates: templates.map((template) => parseTemplate(template)),
        },
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get templates: ${error}`,
        error,
      });
    }
  },
});
