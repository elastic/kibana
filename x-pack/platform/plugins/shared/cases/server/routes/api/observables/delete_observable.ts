/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INTERNAL_CASE_OBSERVABLES_DELETE_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const deleteObservableRoute = createCasesRoute({
  method: 'delete',
  path: INTERNAL_CASE_OBSERVABLES_DELETE_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string(),
      observable_id: schema.string(),
    }),
  },
  routerOptions: {
    access: 'internal',
    summary: `Delete a case observable`,
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseId = request.params.case_id;
      const observableId = request.params.observable_id;

      await casesClient.cases.deleteObservable(caseId, observableId);

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete observable in route case id: ${request.params.case_id}, observable id: ${request.params.observable_id}: ${error}`,
        error,
      });
    }
  },
});
