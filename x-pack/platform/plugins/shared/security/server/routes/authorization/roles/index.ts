/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineDeleteRolesRoutes } from './delete';
import { defineGetRolesRoutes } from './get';
import { defineGetAllRolesRoutes } from './get_all';
import { defineGetAllRolesBySpaceRoutes } from './get_all_by_space';
import { defineBulkCreateOrUpdateRolesRoutes } from './post';
import { definePutRolesRoutes } from './put';
import { defineQueryRolesRoutes } from './query';
import type { RouteDefinitionParams } from '../..';

export function defineRolesRoutes(params: RouteDefinitionParams) {
  defineGetRolesRoutes(params);
  defineGetAllRolesRoutes(params);
  defineDeleteRolesRoutes(params);
  definePutRolesRoutes(params);
  defineGetAllRolesBySpaceRoutes(params);
  defineBulkCreateOrUpdateRolesRoutes(params);
  defineQueryRolesRoutes(params);
}
