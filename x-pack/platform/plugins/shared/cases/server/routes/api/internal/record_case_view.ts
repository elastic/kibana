/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { INTERNAL_CASE_DELTA_VIEWED_URL } from '../../../../common/constants';
import type { deltaApiV1 } from '../../../../common/types/api';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const recordCaseViewRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_CASE_DELTA_VIEWED_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string({ maxLength: 256 }),
    }),
    body: schema.object({
      markSeen: schema.maybe(schema.boolean()),
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
      const { markSeen } = request.body;

      const body: deltaApiV1.CaseViewedResponse = await casesClient.userActions.recordView({
        caseId,
        markSeen,
      });

      return response.ok({ body });
    } catch (error) {
      throw createCaseError({
        message: `Failed to record view in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
