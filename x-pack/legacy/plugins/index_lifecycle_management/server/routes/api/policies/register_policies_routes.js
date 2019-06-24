/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerFetchRoute } from './register_fetch_route';
import { registerCreateRoute } from './register_create_route';
import { registerDeleteRoute } from './register_delete_route';

export function registerPoliciesRoutes(server) {
  registerFetchRoute(server);
  registerCreateRoute(server);
  registerDeleteRoute(server);
}
