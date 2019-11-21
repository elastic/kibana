/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerListRoute } from './register_list_route';
import { registerDetailsRoute } from './register_details_route';

export function registerNodesRoutes(server) {
  registerListRoute(server);
  registerDetailsRoute(server);
}
