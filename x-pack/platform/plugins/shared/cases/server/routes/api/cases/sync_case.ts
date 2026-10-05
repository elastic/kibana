/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeWithExcessOrThrow } from '../../../common/runtime_types';
import { CASE_SYNC_URL } from '../../../../common/constants';
import type { CaseRoute } from '../types';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { caseApiV1 } from '../../../../common/types/api';
import type { caseDomainV1 } from '../../../../common/types/domain';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { toLegacyCaseResponse } from '../../../common/attachments';

export const syncCaseRoute: CaseRoute = createCasesRoute({
  method: 'post',
  path: CASE_SYNC_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'public',
    summary: `Sync a case from its external incident`,
    description:
      'Technical preview. Fetches the incident the case was pushed to and applies its title, description, and status to the case according to the case conflict strategy.',
    tags: ['oas-tag:cases'],
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const params = decodeWithExcessOrThrow(caseApiV1.CaseSyncRequestParamsRt)(request.params);
      const res: caseDomainV1.Case = toLegacyCaseResponse(
        await casesClient.cases.sync({ caseId: params.case_id })
      );

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to sync case in route: ${error}`,
        error,
      });
    }
  },
});
