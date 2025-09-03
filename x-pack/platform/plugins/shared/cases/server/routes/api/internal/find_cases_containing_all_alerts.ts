/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { type IKibanaResponse } from '@kbn/core/server';
import pLimit from 'p-limit';
import { createCasesRoute } from '../create_cases_route';
import { INTERNAL_CASE_GET_CASES_BY_ATTACHMENT_URL } from '../../../../common/constants';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { type CasesClient } from '../../../client';
import { type caseApiV1 } from '../../../../common/types/api';
import { buildFilter } from '../../../client/utils';

// cases modal shows 10 cases by default
const MAX_CONCURRENT_CASES = 10;

export const findCasesContainingAllAlertsRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_CASE_GET_CASES_BY_ATTACHMENT_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    body: schema.object({
      alertIds: schema.arrayOf(schema.string()),
      caseIds: schema.arrayOf(schema.string()),
    }),
  },
  routerOptions: {
    access: 'internal',
  },
  handler: async ({
    context,
    request,
    response,
  }): Promise<IKibanaResponse<{ casesWithAllAttachments: string[] }>> => {
    const { alertIds, caseIds } = request.body as caseApiV1.FindCasesContainingAllAlertsRequest;

    if (!caseIds.length || !alertIds.length) {
      return response.ok({
        body: { casesWithAllAttachments: [] },
      });
    }

    const caseIdsToCheck = Array.isArray(caseIds) ? caseIds : [caseIds];

    const alertIdSet = new Set(alertIds);
    const casesContext = await context.cases;
    const casesClient = await casesContext.getCasesClient();

    const limit = pLimit(MAX_CONCURRENT_CASES);

    const results: Array<string | null> = await Promise.all(
      caseIdsToCheck.map((caseId) => {
        return limit(async () => processCase(casesClient, caseId, alertIdSet));
      })
    );

    return response.ok({
      body: {
        casesWithAllAttachments: results.filter((id): id is string => id !== null),
      },
    });
  },
});

export const isStringOrArray = (value: unknown): value is string | string[] => {
  return (
    typeof value === 'string' ||
    (Array.isArray(value) && value.every((item) => typeof item === 'string'))
  );
};

export const processCase = async (
  casesClient: CasesClient,
  caseId: string,
  alertIds: Set<string>
) => {
  const alertsForCase = await casesClient.attachments.getAllAlertsAttachToCase({
    caseId,
    filter: buildFilter({
      filters: Array.from(alertIds),
      field: 'alertId',
      operator: 'or',
      type: 'cases-comments',
    }),
  });

  return alertIds.size === alertsForCase.length ? caseId : null;
};
