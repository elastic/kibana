/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { IncidentTimelineAlertsResponse } from '../../../../common/types/api';
import {
  INTERNAL_INCIDENT_TIMELINE_ALERTS_URL,
  MAX_CASE_ID_LENGTH,
} from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const getIncidentTimelineAlertsRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_INCIDENT_TIMELINE_ALERTS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string({ minLength: 1, maxLength: MAX_CASE_ID_LENGTH }),
    }),
  },
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();

      const body: IncidentTimelineAlertsResponse = await client.metrics.getIncidentTimelineAlerts({
        caseId: request.params.case_id,
      });

      return response.ok({ body });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get incident timeline alerts in route: ${error}`,
        error,
      });
    }
  },
});
