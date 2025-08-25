/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesRoute } from '../create_cases_route';
import { INTERNAL_CASE_GET_CASES_BY_ATTACHMENT_URL } from '../../../../common/constants';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

const params = {};

export const getCasesByAttachmentRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_CASE_GET_CASES_BY_ATTACHMENT_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params,
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response }) => {
    console.log('request.query', request.query);
    const { selectedAlertIds, caseIds } = request.query;

    if (!caseIds) {
      return response.ok({
        body: { disabledCases: [] },
      });
    }

    if (!selectedAlertIds) {
      return response.badRequest({
        body: { message: 'Must supply at least one alert to check' },
      });
    }

    const caseIdsToCheck = Array.isArray(caseIds) ? caseIds : [caseIds];
    console.log('caseids to check', caseIdsToCheck);

    const alertIds = new Set(
      Array.isArray(selectedAlertIds) ? selectedAlertIds : [selectedAlertIds]
    );
    const casesContext = await context.cases;
    const casesClient = await casesContext.getCasesClient();
    const stats = await Promise.all(
      caseIdsToCheck.map(async (caseId) => {
        console.log('the case id', caseId);
        const statsResult = await casesClient.userActions.stats({
          caseId,
        });
        return {
          caseId,
          ...statsResult,
        };
      })
    );
    const caseIdsToQuery: string[] = [];
    stats.forEach(({ caseId, total }) => {
      if (total >= alertIds.size) {
        caseIdsToQuery.push(caseId);
      }
    });

    const caseActions = await Promise.all(
      caseIdsToQuery.map((caseId) => {
        console.log('querying for ', caseId);
        return casesClient.userActions.find({
          caseId,
          params: {
            types: ['alert'],
          },
        });
      })
    );

    console.log('caseActions:', JSON.stringify(caseActions, null, 2));
    // const actionsStats = await casesClient.userActions.stats({
    //   caseId: caseIds,
    // });
    // const actions = await casesClient.userActions.find({
    //   caseId: caseIds,
    //   params: {
    //     types: ['alert'],
    //   },
    // });
    // console.log('actions stats', stats, 'actions', JSON.stringify(actions));
    console.log('actions stats', stats);

    return response.ok({ body: { good: true } });
  },
});
