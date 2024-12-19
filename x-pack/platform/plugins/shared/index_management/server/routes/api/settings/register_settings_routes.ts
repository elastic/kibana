/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../../types';

import { registerLoadRoute } from './register_load_route';
import { registerUpdateRoute } from './register_update_route';

export function registerSettingsRoutes(dependencies: RouteDependencies) {
  registerLoadRoute(dependencies);
  registerUpdateRoute(dependencies);
}
