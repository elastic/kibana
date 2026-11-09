/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerJobRoutes } from './jobs';
import { registerTaskRoutes } from './tasks';
import type { RouteDependencies } from './types';

export type { RouteDependencies } from './types';

export const registerRoutes = (deps: RouteDependencies) => {
  registerJobRoutes(deps);
  registerTaskRoutes(deps);
};
