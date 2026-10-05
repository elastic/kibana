/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  INTERNAL_CASE_OBSERVABLES_BULK_DELETE_URL,
  MAX_OBSERVABLES_PER_CASE,
  OBSERVABLE_ID_MAX_LENGTH,
} from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const bulkDeleteObservablesRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_CASE_OBSERVABLES_BULK_DELETE_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
    body: schema.object({
      ids: schema.arrayOf(schema.string({ maxLength: OBSERVABLE_ID_MAX_LENGTH }), {
        minSize: 1,
        maxSize: MAX_OBSERVABLES_PER_CASE,
      }),
    }),
  },
  routerOptions: {
    access: 'internal',
    summary: `Bulk delete case observables`,
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseId = request.params.case_id;
      const { ids } = request.body;

      const updatedCase = await casesClient.cases.bulkDeleteObservables({
        caseId,
        observableIds: ids,
      });

      return response.ok({
        body: updatedCase,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to bulk delete observables in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
