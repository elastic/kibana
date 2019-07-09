/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Router } from '../../../../../../server/lib/create_router';
import { registerListRoute } from './register_list_route';
import { registerDeleteRoute } from './register_delete_route';
import { registerCreateRoute } from './register_create_route';

export function registerTemplatesRoutes(router: Router) {
  registerListRoute(router);
  registerDeleteRoute(router);
  registerCreateRoute(router);
}
