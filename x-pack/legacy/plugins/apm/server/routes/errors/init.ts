/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalCoreSetup } from 'src/core/server';
import { errorGroupListRoute } from './error_group_list_route';
import { errorGroupRoute } from './error_group_route';
import { errorDistributionRoute } from './error_distribution_route';

export function initErrorsApi(core: InternalCoreSetup) {
  const { server } = core.http;
  server.route(errorGroupListRoute);
  server.route(errorGroupRoute);
  server.route(errorDistributionRoute);
}
