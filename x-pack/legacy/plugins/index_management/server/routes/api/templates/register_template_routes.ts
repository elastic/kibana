/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Router } from '../../../../../../server/lib/create_router';
import { registerGetAllRoute, registerGetOneRoute } from './register_get_routes';
import { registerDeleteRoute } from './register_delete_route';
import { registerCreateRoute } from './register_create_route';
import { registerUpdateRoute } from './register_update_route';

export function registerTemplateRoutes(router: Router, server: any) {
  registerGetAllRoute(router, server);
  registerGetOneRoute(router, server);
  registerDeleteRoute(router);
  registerCreateRoute(router);
  registerUpdateRoute(router);
}
