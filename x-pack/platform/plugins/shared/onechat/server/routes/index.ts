/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from './types';
import { registerToolsRoutes } from './tools';
import { registerESQLToolsRoutes } from './esql-tools';

export const registerRoutes = (dependencies: RouteDependencies) => {
  registerToolsRoutes(dependencies);
  registerESQLToolsRoutes(dependencies);
};
