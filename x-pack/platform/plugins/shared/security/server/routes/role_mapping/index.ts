/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineRoleMappingDeleteRoutes } from './delete';
import { defineRoleMappingGetRoutes } from './get';
import { defineRoleMappingPostRoutes } from './post';
import type { RouteDefinitionParams } from '..';

export function defineRoleMappingRoutes(params: RouteDefinitionParams) {
  defineRoleMappingGetRoutes(params);
  defineRoleMappingPostRoutes(params);
  defineRoleMappingDeleteRoutes(params);
}
