/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INTERNAL_CASE_OBSERVABLES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { observableApiV1 } from '../../../../common/types/api';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const postObservableRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_CASE_OBSERVABLES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
  },
  routerOptions: {
    access: 'internal',
    summary: `Add a case observable`,
    description: 'Each case can have a maximum of 10 observables.',
    // You must have `all` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're creating.
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseId = request.params.case_id;
      const { observable } = request.body as observableApiV1.AddObservableRequest;
      const theCase = await casesClient.cases.addObservable(caseId, { observable });

      return response.ok({
        body: theCase,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to post observable in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
