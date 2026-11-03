/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerEsqlRoutes } from './esql_routes';
import { registerIndexRoutes } from './index_routes';
import { registerMetadataRoute } from './metadata_route';
import type { RouteDependencies } from './types';

/** Registers all Index Explorer HTTP routes. */
export function registerRoutes(dependencies: RouteDependencies): void {
  registerMetadataRoute(dependencies);
  registerIndexRoutes(dependencies);
  registerEsqlRoutes(dependencies);
}
