/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineGetPrivilegesRoutes } from './get';
import { defineGetBuiltinPrivilegesRoutes } from './get_builtin';
import type { RouteDefinitionParams } from '../..';

export function definePrivilegesRoutes(params: RouteDefinitionParams) {
  defineGetPrivilegesRoutes(params);
  defineGetBuiltinPrivilegesRoutes(params);
}
