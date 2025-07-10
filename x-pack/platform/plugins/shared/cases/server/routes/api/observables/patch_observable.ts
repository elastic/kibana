/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INTERNAL_CASE_OBSERVABLES_PATCH_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { observableApiV1 } from '../../../../common/types/api';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const patchObservableRoute = createCasesRoute({
  method: 'patch',
  path: INTERNAL_CASE_OBSERVABLES_PATCH_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string(),
      observable_id: schema.string(),
    }),
  },
  routerOptions: {
    access: 'internal',
    summary: `Update a case observable`,
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseId = request.params.case_id;
      const observableId = request.params.observable_id;

      const { observable } = request.body as observableApiV1.UpdateObservableRequest;

      const theCase = await casesClient.cases.updateObservable(caseId, observableId, {
        observable,
      });

      return response.ok({
        body: theCase,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to patch observable in route case id: ${request.params.case_id}, observable id: ${request.params.observable_id}: ${error}`,
        error,
      });
    }
  },
});
