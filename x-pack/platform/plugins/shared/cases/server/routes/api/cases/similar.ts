/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INTERNAL_CASE_SIMILAR_CASES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { caseApiV1 } from '../../../../common/types/api';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const similarCaseRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_CASE_SIMILAR_CASES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
  },
  routerOptions: {
    access: 'internal',
    summary: `Similar cases`,
  },
  handler: async ({ context, request, response }) => {
    const options = request.body as caseApiV1.SimilarCasesSearchRequest;
    const caseId = request.params.case_id;

    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const res: caseApiV1.CasesSimilarResponse = await casesClient.cases.similar(caseId, {
        ...options,
      });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find similar cases in route for case with ID ${caseId}: ${error}`,
        error,
      });
    }
  },
});
