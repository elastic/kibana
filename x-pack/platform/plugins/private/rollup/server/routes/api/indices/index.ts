/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../../../types';
import { registerGetRoute } from './register_get_route';
import { registerValidateIndexPatternRoute } from './register_validate_index_pattern_route';
import { registerGetIndexCapsRoute } from './register_get_index_caps';

export function registerIndicesRoutes(dependencies: RouteDependencies) {
  registerGetRoute(dependencies);
  registerValidateIndexPatternRoute(dependencies);
  registerGetIndexCapsRoute(dependencies);
}
