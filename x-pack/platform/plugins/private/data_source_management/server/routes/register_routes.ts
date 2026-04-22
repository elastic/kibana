/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';

import { registerDeleteDataSourceRoute } from './data_sources/delete_data_source_route';
import { registerGetDataSourceRoute } from './data_sources/get_data_source_route';
import { registerListDataSourcesRoute } from './data_sources/list_data_sources_route';
import { registerPutDataSourceRoute } from './data_sources/put_data_source_route';

export function registerDataSourceManagementRoutes(router: IRouter): void {
  registerListDataSourcesRoute(router);
  registerGetDataSourceRoute(router);
  registerPutDataSourceRoute(router);
  registerDeleteDataSourceRoute(router);
}
