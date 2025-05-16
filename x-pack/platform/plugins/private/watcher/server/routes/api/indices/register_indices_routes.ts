/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerGetRoute } from './register_get_route';
import { registerGetIndexPatternsRoute } from './register_get_index_patterns_route';
import { RouteDependencies } from '../../../types';

export function registerIndicesRoutes(deps: RouteDependencies) {
  registerGetRoute(deps);
  registerGetIndexPatternsRoute(deps);
}
