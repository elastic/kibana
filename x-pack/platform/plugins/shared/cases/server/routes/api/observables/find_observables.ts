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
  MAX_OBSERVABLE_VALUE_LENGTH,
  MAX_OBSERVABLES_CURSOR_LENGTH,
  MAX_OBSERVABLES_PER_CASE,
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
      perPage: schema.maybe(schema.number({ min: 1, max: MAX_OBSERVABLES_PER_PAGE })),
      cursor: schema.maybe(schema.string({ maxLength: MAX_OBSERVABLES_CURSOR_LENGTH })),
      sortField: schema.maybe(
        schema.oneOf([
          schema.literal('createdAt'),
          schema.literal('value'),
          schema.literal('typeKey'),
        ])
      ),
      sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
      typeKeys: schema.maybe(
        schema.arrayOf(schema.string({ maxLength: MAX_OBSERVABLE_TYPE_KEY_LENGTH }), {
          maxSize: MAX_OBSERVABLES_PER_CASE,
        })
      ),
      search: schema.maybe(schema.string({ maxLength: MAX_OBSERVABLE_VALUE_LENGTH })),
    }),
  },
  routerOptions: {
    access: 'internal',
    summary: 'Find the observables of a case',
    description:
      'Returns a page of the observables of a case, sorted, filtered by type and by the start of the value (ignoring case). Pass the returned cursor back to get the next page.',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseId = request.params.case_id;
      const result = await casesClient.cases.findObservables(caseId, request.body);

      return response.ok({ body: result });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find observables in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
