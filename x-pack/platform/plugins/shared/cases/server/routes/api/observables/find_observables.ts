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
  MAX_OBSERVABLES_FIND_PER_PAGE,
  MAX_OBSERVABLES_PER_CASE,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OBSERVABLE_VALUE_LENGTH,
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
      perPage: schema.maybe(schema.number({ min: 1, max: MAX_OBSERVABLES_FIND_PER_PAGE })),
      cursor: schema.maybe(schema.string({ maxLength: 1024 })),
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
    summary: `Find case observables`,
    description: `Pages a case's observables with a cursor, sorted by creation time, value or type, and filtered by type and value.`,
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const { perPage, cursor, sortField, sortOrder, typeKeys, search } = request.body;

      const result = await casesClient.cases.findObservables({
        caseId: request.params.case_id,
        ...(perPage != null && { perPage }),
        ...(cursor != null && { cursor }),
        ...(sortField != null && { sortField }),
        ...(sortOrder != null && { sortOrder }),
        ...(typeKeys != null && { typeKeys }),
        ...(search != null && { search }),
      });

      return response.ok({ body: result });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find observables in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
