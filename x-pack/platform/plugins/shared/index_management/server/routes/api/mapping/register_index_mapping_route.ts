/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../../../types';
import { registerGetMappingRoute } from './register_mapping_route';
import { registerUpdateMappingRoute } from './register_update_mapping_route';
import { registerUserStatusPrivilegeRoutes } from './register_user_status_route';

export function registerIndexMappingRoutes(dependencies: RouteDependencies) {
  registerGetMappingRoute(dependencies);
  registerUpdateMappingRoute(dependencies);
  registerUserStatusPrivilegeRoutes(dependencies);
}
