/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterAPIRoutesArgs } from '../types';
import { registerLensInternalAPIRoutes } from './internal';
import { registerLensVisualizationsAPIRoutes } from './visualizations';

export function registerLensAPIRoutes(args: RegisterAPIRoutesArgs) {
  registerLensInternalAPIRoutes(args);
  registerLensVisualizationsAPIRoutes(args);
}

export * from './internal/schema';
