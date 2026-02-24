/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesUpdateTriggerId } from '@kbn/workflows-extensions/common';
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
  routerOptions: {
    access: 'public',
    summary: 'Update cases',
    tags: ['oas-tag:cases'],
  },
  handler: async ({ context, request, response, logger }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const cases = request.body as caseApiV1.CasesPatchRequest;

      const res: caseDomainV1.Cases = await casesClient.cases.bulkUpdate(cases);

      const workflowsExtensions = await caseContext.getWorkflowsExtensions?.();
      if (workflowsExtensions) {
        for (const c of res) {
          try {
            await workflowsExtensions.emitEvent({
              triggerType: CasesUpdateTriggerId,
              payload: {
                case: {
                  id: c.id,
                  owner: c.owner,
                  title: c.title,
                  status: c.status,
                  severity: c.severity,
                  version: c.version,
                  updatedAt: c.updated_at ?? undefined,
                },
              },
              kibanaRequest: request,
            });
          } catch (emitError) {
            // Log but do not fail the PATCH response
            logger.error(`Failed to emit cases.update event for case ${c.id}: ${emitError}`);
          }
        }
      }

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
