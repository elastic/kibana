/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { KpiMetricsResponse } from '../../../../common/types/api';
import {
  INTERNAL_KPI_METRICS_URL,
  MAX_METRIC_DATE_LENGTH,
  MAX_OWNER_LENGTH,
} from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const getKpiMetricsRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_KPI_METRICS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
  },
  params: {
    query: schema.object({
      owner: schema.string({ minLength: 1, maxLength: MAX_OWNER_LENGTH }),
      from: schema.maybe(schema.string({ maxLength: MAX_METRIC_DATE_LENGTH })),
      to: schema.maybe(schema.string({ maxLength: MAX_METRIC_DATE_LENGTH })),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();

      const responseBody: KpiMetricsResponse = await client.metrics.getKpiMetrics(request.query);

      return response.ok({ body: responseBody });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get KPI metrics in route: ${error}`,
        error,
      });
    }
  },
});
