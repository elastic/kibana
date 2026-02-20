/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getUnifiedHistoryRoute } from './get_unified_history_route';
import { getScheduledExecutionDetailsRoute } from './get_scheduled_execution_details_route';
import { getScheduledActionResultsRoute } from './get_scheduled_action_results_route';
import { getScheduledQueryResultsRoute } from './get_scheduled_query_results_route';

export const initUnifiedHistoryRoutes = (
  router: IRouter<DataRequestHandlerContext>,
  context: OsqueryAppContext
) => {
  if (!context.experimentalFeatures.queryHistoryRework) return;

  getUnifiedHistoryRoute(router, context);
  getScheduledExecutionDetailsRoute(router, context);
  getScheduledActionResultsRoute(router, context);
  getScheduledQueryResultsRoute(router, context);
};
