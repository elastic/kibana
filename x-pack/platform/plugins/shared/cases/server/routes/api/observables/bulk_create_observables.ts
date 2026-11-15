/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  INTERNAL_CASE_OBSERVABLES_BULK_CREATE_URL,
  MAX_BULK_CREATE_OBSERVABLES,
  MAX_CASE_ID_LENGTH,
  MAX_OBSERVABLE_DESCRIPTION_LENGTH,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OBSERVABLE_VALUE_LENGTH,
  MAX_STORED_OBSERVABLES_PER_CASE,
} from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const bulkCreateObservablesRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_CASE_OBSERVABLES_BULK_CREATE_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string({ maxLength: MAX_CASE_ID_LENGTH }),
    }),
    body: schema.object({
      observables: schema.arrayOf(
        schema.object({
          typeKey: schema.string({ maxLength: MAX_OBSERVABLE_TYPE_KEY_LENGTH }),
          value: schema.string({ maxLength: MAX_OBSERVABLE_VALUE_LENGTH }),
          description: schema.nullable(
            schema.string({ maxLength: MAX_OBSERVABLE_DESCRIPTION_LENGTH })
          ),
        }),
        { minSize: 1, maxSize: MAX_BULK_CREATE_OBSERVABLES }
      ),
    }),
  },
  routerOptions: {
    access: 'internal',
    summary: 'Bulk add case observables',
    description: `Adds up to ${MAX_BULK_CREATE_OBSERVABLES} observables to a case. A case holds at most ${MAX_STORED_OBSERVABLES_PER_CASE} observables. The response lists the observables that were added, and the ones skipped because the case already holds them or is full.`,
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseId = request.params.case_id;
      const result = await casesClient.cases.bulkCreateObservables(caseId, request.body);

      return response.ok({ body: result });
    } catch (error) {
      throw createCaseError({
        message: `Failed to bulk create observables in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
