/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineChangeAccessRoutes } from './change_access';
import { defineGetAccessRoute } from './get_access';
import { defineGetAccessPolicyRoute } from './get_policy';
import { defineSuggestPrincipalsRoute } from './suggest_principals';
import type { RouteDefinitionParams } from '..';

/**
 * Defines the generic object-level access API, shared by every type with an access policy.
 */
export function defineAccessControlRoutes(params: RouteDefinitionParams) {
  defineGetAccessPolicyRoute(params);
  defineSuggestPrincipalsRoute(params);
  defineGetAccessRoute(params);
  defineChangeAccessRoutes(params);
}
