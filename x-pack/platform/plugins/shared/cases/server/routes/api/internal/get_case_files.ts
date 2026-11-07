/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INTERNAL_CASE_FILES_URL } from '../../../../common/constants';
import { MAX_FILES_PER_CASE } from '../../../../common/constants/files';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const getCaseFilesRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_CASE_FILES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string({ maxLength: 100 }),
    }),
    query: schema.object({
      page: schema.number({ defaultValue: 1, min: 1 }),
      perPage: schema.number({ defaultValue: 10, min: 1, max: MAX_FILES_PER_CASE }),
      searchTerm: schema.maybe(schema.string({ maxLength: 256 })),
    }),
  },
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response }) => {
    try {
      const casesContext = await context.cases;
      const casesClient = await casesContext.getCasesClient();
      const { page, perPage, searchTerm } = request.query;

      const res = await casesClient.attachments.getFiles({
        caseId: request.params.case_id,
        page,
        perPage,
        searchTerm,
      });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve files in route for case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
