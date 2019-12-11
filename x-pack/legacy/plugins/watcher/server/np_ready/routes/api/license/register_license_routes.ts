/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerRefreshRoute } from './register_refresh_route';
import { RouteDependencies, ServerShim } from '../../../types';

export function registerLicenseRoutes(deps: RouteDependencies, legacy: ServerShim) {
  registerRefreshRoute(deps, legacy);
}
