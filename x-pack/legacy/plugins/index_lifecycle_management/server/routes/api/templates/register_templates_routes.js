/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerFetchRoute } from './register_fetch_route';
import { registerGetRoute } from './register_get_route';
import { registerAddPolicyRoute } from './register_add_policy_route';

export function registerTemplatesRoutes(server) {
  registerFetchRoute(server);
  registerGetRoute(server);
  registerAddPolicyRoute(server);
}
