/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../../types';

import { registerListRoute } from './register_list_route';
import { registerDeleteRoute } from './register_delete_route';
import { registerExecuteRoute } from './register_execute_route';
import { registerCreateRoute } from './register_create_route';
import { registerPrivilegesRoute } from './register_privileges_route';

export function registerEnrichPoliciesRoute(dependencies: RouteDependencies) {
  registerListRoute(dependencies);
  registerDeleteRoute(dependencies);
  registerExecuteRoute(dependencies);
  registerCreateRoute(dependencies);
  registerPrivilegesRoute(dependencies);
}
