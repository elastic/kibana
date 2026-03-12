/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { caseApiV1 } from '../../../../common/types/api';
import type { caseDomainV1 } from '../../../../common/types/domain';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const patchCaseRoute = createCasesRoute({
  method: 'patch',
  path: CASES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    query: schema.object({
      include_alerts_status_update_summary: schema.boolean({ defaultValue: false }),
    }),
  },
  routerOptions: {
    access: 'public',
    summary: 'Update cases',
    tags: ['oas-tag:cases'],
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const cases = request.body as caseApiV1.CasesPatchRequest;
      const includeAlertsStatusUpdateSummary = request.query.include_alerts_status_update_summary;
      const res: caseDomainV1.Cases | caseApiV1.CasesPatchResponse =
        includeAlertsStatusUpdateSummary
          ? await casesClient.cases.bulkUpdateWithAlertsStatusSummary(cases)
          : await casesClient.cases.bulkUpdate(cases);

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to patch cases in route: ${error}`,
        error,
      });
    }
  },
});
