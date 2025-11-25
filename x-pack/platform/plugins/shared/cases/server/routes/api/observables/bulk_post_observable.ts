/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  INTERNAL_BULK_CREATE_CASE_OBSERVABLES_URL,
  MAX_OBSERVABLES_PER_CASE,
} from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { observableApiV1 } from '../../../../common/types/api';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const bulkPostObservableRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_BULK_CREATE_CASE_OBSERVABLES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
  },
  routerOptions: {
    access: 'internal',
    summary: 'Bulk add case observables',
    description: `Each case can have a maximum of ${MAX_OBSERVABLES_PER_CASE} observables.`,
    // You must have `all` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're creating.
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseId = request.params.case_id;
      const { observables } = request.body as observableApiV1.BulkAddObservablesRequest;
      const theCase = await casesClient.cases.bulkAddObservables({ caseId, observables });

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
