/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KpiMetricsRequest, KpiMetricsResponse } from '../../../../common/types/api';
import { INTERNAL_KPI_METRICS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const getKpiMetricsRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_KPI_METRICS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      const body = request.body as KpiMetricsRequest;

      const responseBody: KpiMetricsResponse = await client.metrics.getKpiMetrics(body);

      return response.ok({ body: responseBody });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get KPI metrics in route: ${error}`,
        error,
      });
    }
  },
});
