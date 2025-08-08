/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

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

export const getCaseMetadataRoute = () =>
  createCasesRoute({
    method: 'get',
    path: `${CASE_DETAILS_URL}/metadata`,
    security: DEFAULT_CASES_ROUTE_SECURITY,
    params,
    routerOptions: {
      access: 'public',
      summary: `Get a case metadata`,
      tags: ['oas-tag:cases'],
    },
    handler: async ({ context, request, response }) => {
      try {
        const caseContext = await context.cases;
        const casesClient = await caseContext.getCasesClient();
        const id = request.params.case_id;

        const res: caseDomainV1.Case = await casesClient.cases.get({
          id,
          includeComments: true,
        });

        console.log('res', res);
        const comments = res.comments

        if(!comments){
          return response.ok({
            body: {},
          });
        }

        const metadata = await casesClient.cases.getMetadata({
          theComments: comments,
        });


        return response.ok({
          body: metadata,
        });
      } catch (error) {
        throw createCaseError({
          message: `Failed to retrieve case in route case id: ${request.params.case_id} \n${error}`,
          error,
        });
      }
    },
  });
