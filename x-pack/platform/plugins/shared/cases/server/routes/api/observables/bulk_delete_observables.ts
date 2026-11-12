/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  INTERNAL_CASE_OBSERVABLES_BULK_DELETE_URL,
  MAX_CASE_ID_LENGTH,
  MAX_OBSERVABLES_PER_CASE,
  MIN_BULK_DELETE_OBSERVABLE_IDS,
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
      case_id: schema.string({ maxLength: MAX_CASE_ID_LENGTH }),
    }),
    body: schema.object({
      observableIds: schema.arrayOf(schema.string({ maxLength: OBSERVABLE_ID_MAX_LENGTH }), {
        minSize: MIN_BULK_DELETE_OBSERVABLE_IDS,
        maxSize: MAX_OBSERVABLES_PER_CASE,
      }),
    }),
  },
  routerOptions: {
    access: 'internal',
    summary: `Bulk delete case observables`,
    description: `Removes up to ${MAX_OBSERVABLES_PER_CASE} observables from a case in a single write. All requested ids must exist on the case; returns 404 if any are missing.`,
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseId = request.params.case_id;
      const { observableIds } = request.body;

      const updatedCase = await casesClient.cases.bulkDeleteObservables({
        caseId,
        observableIds,
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
