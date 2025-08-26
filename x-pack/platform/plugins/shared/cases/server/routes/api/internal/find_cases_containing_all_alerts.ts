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

// cases modal shows 10 cases by default
const MAX_CONCURRENT_CASES = 10;

export const findCasesContainingAllAlertsRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_CASE_GET_CASES_BY_ATTACHMENT_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    body: schema.object({
      alertIds: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
      caseIds: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
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

    if (!caseIds || !alertIds) {
      return response.ok({
        body: { casesWithAllAttachments: [] },
      });
    }

    if (!isStringOrArray(caseIds) || !isStringOrArray(alertIds)) {
      return response.badRequest({
        body: { message: 'Invalid request parameters' },
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
  const caseAlertIds = new Set<string>();

  const alertsForCase = await casesClient.attachments.getAllAlertsAttachToCase({
    caseId,
  });

  // there are more selected alerts than attached alerts
  if (alertIds.size > alertsForCase.length) return null;

  // we must walk the case's attached alerts
  for (const alert of alertsForCase) {
    if (alertIds.has(alert.id)) {
      caseAlertIds.add(alert.id);
    }
  }

  // `caseSet` will only contain matched IDs, if the ID count is the same the case contains all selected alerts
  if (alertIds.size === caseAlertIds.size) {
    return caseId;
  }

  return null;
};
