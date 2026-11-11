/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  INTERNAL_COUNT_CASES_BY_OBSERVABLES_URL,
  MAX_CASE_ID_LENGTH,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OBSERVABLE_VALUE_LENGTH,
  MAX_OBSERVABLES_PER_PAGE,
  MAX_OWNER_LENGTH,
} from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const countCasesByObservablesRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_COUNT_CASES_BY_OBSERVABLES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    body: schema.object({
      owner: schema.string({ minLength: 1, maxLength: MAX_OWNER_LENGTH }),
      observables: schema.arrayOf(
        schema.object({
          typeKey: schema.string({ minLength: 1, maxLength: MAX_OBSERVABLE_TYPE_KEY_LENGTH }),
          value: schema.string({ minLength: 1, maxLength: MAX_OBSERVABLE_VALUE_LENGTH }),
        }),
        { minSize: 1, maxSize: MAX_OBSERVABLES_PER_PAGE }
      ),
      excludeCaseId: schema.maybe(schema.string({ maxLength: MAX_CASE_ID_LENGTH })),
    }),
  },
  routerOptions: {
    access: 'internal',
    summary: 'Count the cases holding each observable',
    description:
      'For each observable, returns how many cases of the owner hold its exact type key and value, in the case field or as a `cases-observables` object. Used for a page of a case observables list.',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const result = await casesClient.cases.countByObservables(request.body);

      return response.ok({ body: result });
    } catch (error) {
      throw createCaseError({
        message: `Failed to count cases by observables in route: ${error}`,
        error,
      });
    }
  },
});
