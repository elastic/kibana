/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterAPIRoutesArgs } from '../../types';
import { registerLensInternalVisualizationsAPIRoutes } from './visualizations';

export function registerLensInternalAPIRoutes(args: RegisterAPIRoutesArgs) {
  registerLensInternalVisualizationsAPIRoutes(args);
}

export * from './schema';
