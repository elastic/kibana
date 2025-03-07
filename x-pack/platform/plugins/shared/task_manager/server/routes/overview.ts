/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from '@kbn/core/server';
import { OverviewService } from '../overview/overview_service';

export interface RouteParams {
  router: IRouter;
  overviewService: OverviewService;
}

export function overviewRoute(params: RouteParams) {
  const { router, overviewService } = params;

  router.get(
    {
      path: `/internal/task_manager/_overview`,
      validate: {},
    },
    async function (
      _: RequestHandlerContext,
      req: KibanaRequest<unknown, unknown, unknown>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> {
      const end = Date.now(); // now
      const start = end - 900000; // now - 15m
      const response = await overviewService.getOverview({
        req,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
      });
      return res.ok({
        body: response,
      });
    }
  );
}
