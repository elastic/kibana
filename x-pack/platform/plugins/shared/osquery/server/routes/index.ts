/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { initLiveQueryRoutes } from './live_query';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { initSavedQueryRoutes } from './saved_query';
import { initStatusRoutes } from './status';
import { initFleetWrapperRoutes } from './fleet_wrapper';
import { initPackRoutes } from './pack';
import { initPrivilegesCheckRoutes } from './privileges_check';
import { initAssetRoutes } from './asset';

export const defineRoutes = (
  router: IRouter<DataRequestHandlerContext>,
  context: OsqueryAppContext
) => {
  initLiveQueryRoutes(router, context);
  initStatusRoutes(router, context);
  initPackRoutes(router, context);
  initFleetWrapperRoutes(router, context);
  initPrivilegesCheckRoutes(router, context);
  initSavedQueryRoutes(router, context);
  initAssetRoutes(router, context);
};
