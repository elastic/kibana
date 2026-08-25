/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineAnonymousAccessGetCapabilitiesRoutes } from './get_capabilities';
import { defineAnonymousAccessGetStateRoutes } from './get_state';
import type { RouteDefinitionParams } from '..';

export function defineAnonymousAccessRoutes(params: RouteDefinitionParams) {
  defineAnonymousAccessGetCapabilitiesRoutes(params);
  defineAnonymousAccessGetStateRoutes(params);
}
