/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router } from '../../../../../../server/lib/create_router';

import { registerLoadRoute } from './register_load_route';
import { registerUpdateRoute } from './register_update_route';

export function registerSettingsRoutes(router: Router) {
  registerLoadRoute(router);
  registerUpdateRoute(router);
}
