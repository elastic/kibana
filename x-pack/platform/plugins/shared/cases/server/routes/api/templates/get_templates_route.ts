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
  handler: async ({ context, request, response, logger }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const {
        page,
        perPage,
        sortField,
        sortOrder,
        search,
        tags,
        author,
        owner,
        isDeleted,
        isEnabled,
      } = request.query;
      const { templates, ...pagination } = await casesClient.templates.getAllTemplates({
        page: Number(page),
        perPage: Number(perPage),
        sortField,
        sortOrder,
        search,
        tags: tags ? castArray(tags).filter(Boolean) : [],
        author: author ? castArray(author).filter(Boolean) : [],
        owner: owner ? castArray(owner).filter(Boolean) : [],
        isDeleted: String(isDeleted) === 'true',
        isEnabled: isEnabled !== undefined ? String(isEnabled) === 'true' : undefined,
      });

      const parsedTemplates = templates
        .map((template) => {
          try {
            return {
              ...parseTemplate(template),
              fieldSearchMatches: template.fieldSearchMatches,
            };
          } catch (parseError) {
            logger.warn(
              `Skipping invalid template "${template.name}" (ID: ${template.templateId}): ${parseError}`
            );
            return null;
          }
        })
        .filter((template): template is NonNullable<typeof template> => template !== null);

      return response.ok({
        body: {
          ...pagination,
          templates: parsedTemplates,
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
