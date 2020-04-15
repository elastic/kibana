/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerAutoFollowPatternRoutes } from './api/auto_follow_pattern';
import { registerFollowerIndexRoutes } from './api/follower_index';
import { registerCcrRoutes } from './api/ccr';
import { RouteDependencies } from './types';

export function registerRoutes(deps: RouteDependencies) {
  registerAutoFollowPatternRoutes(deps);
  registerFollowerIndexRoutes(deps);
  registerCcrRoutes(deps);
}
