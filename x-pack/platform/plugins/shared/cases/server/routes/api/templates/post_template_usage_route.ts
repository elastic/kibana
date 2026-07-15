/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INTERNAL_TEMPLATE_USAGE_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

/**
 * POST /internal/cases/templates/_usage
 * Returns the cases the caller can read that currently apply any of the given templates. Powers the
 * delete-confirmation dialog (shows which cases will be unlinked before a template is deleted).
 */
export const postTemplateUsageRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_TEMPLATE_USAGE_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Get the cases that currently apply the given templates',
  },
  params: {
    body: schema.object({
      ids: schema.arrayOf(schema.string(), { minSize: 1 }),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const usage = await casesClient.templates.getCasesUsingTemplates(request.body.ids);

      return response.ok({ body: usage });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get template usage: ${error}`,
        error,
      });
    }
  },
});
