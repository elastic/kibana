/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  INTERNAL_CASE_OBSERVABLES_EXTRACT_URL,
  MAX_CASE_ID_LENGTH,
} from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const extractObservablesRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_CASE_OBSERVABLES_EXTRACT_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string({ maxLength: MAX_CASE_ID_LENGTH }),
    }),
  },
  routerOptions: {
    access: 'internal',
    summary: `Extract observables from the alerts and events attached to a case`,
    description: `Reads the alerts and events attached to the case and adds the new observables to it. Returns 400 when observable extraction is turned off for the case.`,
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseId = request.params.case_id;

      const result = await casesClient.cases.extractObservables(caseId);

      return response.ok({
        body: result,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to extract observables in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
