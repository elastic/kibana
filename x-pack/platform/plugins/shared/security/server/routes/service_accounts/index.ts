/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCreateServiceAccountRoute } from './create';
import { defineDeleteServiceAccountRoute } from './delete';
import { defineGetServiceAccountRoute } from './get';
import { defineListServiceAccountsRoute } from './list';
import { defineListServiceAccountWorkloadsRoute } from './list_workloads';
import type { RouteDefinitionParams } from '..';

export function defineServiceAccountsRoutes(params: RouteDefinitionParams) {
  defineCreateServiceAccountRoute(params);
  defineListServiceAccountsRoute(params);
  defineGetServiceAccountRoute(params);
  defineDeleteServiceAccountRoute(params);
  defineListServiceAccountWorkloadsRoute(params);
}
