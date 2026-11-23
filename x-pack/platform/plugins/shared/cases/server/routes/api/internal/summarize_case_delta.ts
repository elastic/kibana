/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INTERNAL_CASE_DELTA_SUMMARY_URL } from '../../../../common/constants';
import type { deltaApiV1 } from '../../../../common/types/api';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const summarizeCaseDeltaRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_CASE_DELTA_SUMMARY_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string({ maxLength: 256 }),
    }),
  },
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response }) => {
    try {
      const casesContext = await context.cases;
      const casesClient = await casesContext.getCasesClient();
      const { case_id: caseId } = request.params;

      const body: deltaApiV1.CaseDeltaSummaryResponse =
        await casesClient.userActions.summarizeDelta({ caseId });

      return response.ok({ body });
    } catch (error) {
      throw createCaseError({
        message: `Failed to summarize the delta in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
