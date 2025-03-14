/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { caseApiV1 } from '../../../../common/types/api';
import type { caseDomainV1 } from '../../../../common/types/domain';
import { CASE_DETAILS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

const params = {
  params: schema.object({
    case_id: schema.string(),
  }),
};

export const getCaseRoute = () =>
  createCasesRoute({
    method: 'get',
    path: CASE_DETAILS_URL,
    security: DEFAULT_CASES_ROUTE_SECURITY,
    params,
    routerOptions: {
      access: 'public',
      summary: `Get a case`,
      tags: ['oas-tag:cases'],
    },
    handler: async ({ context, request, response, logger, kibanaVersion }) => {
      try {
        const caseContext = await context.cases;
        const casesClient = await caseContext.getCasesClient();
        const id = request.params.case_id;

        const res: caseDomainV1.Case = await casesClient.cases.get({
          id,
          includeComments: false,
        });

        const { comments, ...caseWithoutComments } = res;

        return response.ok({
          body: caseWithoutComments,
        });
      } catch (error) {
        throw createCaseError({
          message: `Failed to retrieve case in route case id: ${request.params.case_id} \n${error}`,
          error,
        });
      }
    },
  });

export const resolveCaseRoute = createCasesRoute({
  method: 'get',
  path: `${CASE_DETAILS_URL}/resolve`,
  routerOptions: {
    access: 'internal',
  },
  params: {
    ...params,
    query: schema.object({
      /**
       * @deprecated since version 8.1.0
       */
      includeComments: schema.boolean({ defaultValue: true, meta: { deprecated: true } }),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const id = request.params.case_id;

      const res: caseApiV1.CaseResolveResponse = await casesClient.cases.resolve({
        id,
        includeComments: request.query.includeComments,
      });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve case in resolve route case id: ${request.params.case_id} \ninclude comments: ${request.query.includeComments}: ${error}`,
        error,
      });
    }
  },
});
