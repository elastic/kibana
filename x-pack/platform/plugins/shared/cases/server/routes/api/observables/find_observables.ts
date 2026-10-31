/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  INTERNAL_CASE_OBSERVABLES_FIND_URL,
  MAX_CASE_ID_LENGTH,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OBSERVABLES_CURSOR_LENGTH,
  MAX_OBSERVABLES_FIND_TYPE_KEYS,
  MAX_OBSERVABLES_PER_PAGE,
} from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const findObservablesRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_CASE_OBSERVABLES_FIND_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string({ maxLength: MAX_CASE_ID_LENGTH }),
    }),
    body: schema.object({
      typeKeys: schema.maybe(
        schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_OBSERVABLE_TYPE_KEY_LENGTH }), {
          maxSize: MAX_OBSERVABLES_FIND_TYPE_KEYS,
        })
      ),
      sortField: schema.maybe(
        schema.oneOf([
          schema.literal('created'),
          schema.literal('updated'),
          schema.literal('value'),
          schema.literal('type'),
        ])
      ),
      sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
      perPage: schema.maybe(schema.number({ min: 1, max: MAX_OBSERVABLES_PER_PAGE })),
      cursor: schema.maybe(
        schema.string({ minLength: 1, maxLength: MAX_OBSERVABLES_CURSOR_LENGTH })
      ),
    }),
  },
  routerOptions: {
    access: 'internal',
    summary: `Find case observables`,
    description: `Returns one page of the observables of a case, sorted and filtered by type on the server, with the number of observables that match and the cursor of the next page. Requires the same access as getting the case.`,
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseId = request.params.case_id;

      const page = await casesClient.cases.findObservables(caseId, request.body);

      return response.ok({
        body: page,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find observables in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
