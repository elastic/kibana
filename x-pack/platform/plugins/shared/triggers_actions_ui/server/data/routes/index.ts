/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { IRouter } from '@kbn/core/server';
import { createTimeSeriesQueryRoute } from './time_series_query';
import { createFieldsRoute } from './fields';
import { createIndicesRoute } from './indices';
import { getService } from '..';

interface RegisterRoutesParams {
  logger: Logger;
  router: IRouter;
  data: ReturnType<typeof getService>;
  baseRoute: string;
}
export function registerRoutes(params: RegisterRoutesParams) {
  const { logger, router, baseRoute, data } = params;
  createTimeSeriesQueryRoute(logger, data.timeSeriesQuery, router, baseRoute);
  createFieldsRoute(logger, router, baseRoute);
  createIndicesRoute(logger, router, baseRoute);
}
