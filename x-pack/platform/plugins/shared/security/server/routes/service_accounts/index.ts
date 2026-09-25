/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCreateServiceAccountRoute } from './create';
import { defineGetServiceAccountRoute } from './get';
import { defineListServiceAccountsRoute } from './list';
import type { RouteDefinitionParams } from '..';

export function defineServiceAccountsRoutes(params: RouteDefinitionParams) {
  defineCreateServiceAccountRoute(params);
  defineListServiceAccountsRoute(params);
  defineGetServiceAccountRoute(params);
}
