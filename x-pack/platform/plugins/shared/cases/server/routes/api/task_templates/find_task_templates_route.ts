/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { castArray } from 'lodash';
import { CASES_TASK_TEMPLATES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

/**
 * GET /api/cases/task_templates
 * Find task templates with optional filters
 */
export const findTaskTemplatesRoute = createCasesRoute({
  method: 'get',
  path: CASES_TASK_TEMPLATES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Find case task templates',
  },
  params: {
    query: schema.object({
      scope: schema.maybe(
        schema.oneOf([schema.literal('global'), schema.literal('space')])
      ),
      tags: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
      owners: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
      search: schema.maybe(schema.string()),
      page: schema.maybe(schema.number({ min: 1 })),
      per_page: schema.maybe(schema.number({ min: 1, max: 100 })),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const { scope, tags, owners, search, page, per_page } = request.query as {
        scope?: 'global' | 'space';
        tags?: string | string[];
        owners?: string | string[];
        search?: string;
        page?: number;
        per_page?: number;
      };

      const result = await casesClient.taskTemplates.find({
        scope,
        tags: tags ? castArray(tags).filter(Boolean) : undefined,
        owners: owners ? castArray(owners).filter(Boolean) : undefined,
        search,
        page,
        per_page,
      });

      return response.ok({ body: result });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find task templates: ${error}`,
        error,
      });
    }
  },
});
