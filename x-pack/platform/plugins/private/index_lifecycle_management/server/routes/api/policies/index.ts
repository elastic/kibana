/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../../../types';
import { registerFetchRoute } from './register_fetch_route';
import { registerCreateRoute } from './register_create_route';
import { registerDeleteRoute } from './register_delete_route';
import { registerExplainRoute } from './register_explain_route';

export function registerPoliciesRoutes(dependencies: RouteDependencies) {
  registerFetchRoute(dependencies);
  registerCreateRoute(dependencies);
  registerDeleteRoute(dependencies);
  registerExplainRoute(dependencies);
}
