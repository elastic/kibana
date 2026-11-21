/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  INTERNAL_FIND_CASES_BY_OBSERVABLE_URL,
  MAX_CASE_ID_LENGTH,
  MAX_CASES_PER_PAGE,
  MAX_DOCS_PER_PAGE,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OBSERVABLE_VALUE_LENGTH,
  MAX_OWNER_LENGTH,
} from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const findCasesByObservableRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_FIND_CASES_BY_OBSERVABLE_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    body: schema.object({
      owner: schema.string({ minLength: 1, maxLength: MAX_OWNER_LENGTH }),
      typeKey: schema.string({ minLength: 1, maxLength: MAX_OBSERVABLE_TYPE_KEY_LENGTH }),
      value: schema.string({ minLength: 1, maxLength: MAX_OBSERVABLE_VALUE_LENGTH }),
      excludeCaseId: schema.maybe(schema.string({ maxLength: MAX_CASE_ID_LENGTH })),
      page: schema.maybe(schema.number({ min: 1, max: MAX_DOCS_PER_PAGE })),
      perPage: schema.maybe(schema.number({ min: 0, max: MAX_CASES_PER_PAGE })),
      sortField: schema.maybe(
        schema.oneOf([
          schema.literal('title'),
          schema.literal('category'),
          schema.literal('createdAt'),
          schema.literal('updatedAt'),
          schema.literal('closedAt'),
          schema.literal('status'),
          schema.literal('severity'),
        ])
      ),
      sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
    }),
  },
  routerOptions: {
    access: 'internal',
    summary: 'Find the cases holding an observable',
    description:
      'Returns a page of the cases of an owner that hold an observable with the exact type key and value, in the case field or as a `cases-observables` object. Pass perPage 0 to get only the total.',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const result = await casesClient.cases.findByObservable(request.body);

      return response.ok({ body: result });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find cases by observable in route: ${error}`,
        error,
      });
    }
  },
});
