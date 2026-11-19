/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerExecutionRoutes } from './executions';
import { registerInternalRoutes } from './internal';
import { registerLibraryRoutes } from './library';
import type { RouteDependencies } from './types';
import { registerWorkflowRoutes } from './workflows';

export function defineRoutes(deps: RouteDependencies): void {
  registerWorkflowRoutes(deps);
  registerExecutionRoutes(deps);
  registerInternalRoutes(deps);
  registerLibraryRoutes(deps);
}
