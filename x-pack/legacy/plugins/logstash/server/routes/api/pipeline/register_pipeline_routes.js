/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerLoadRoute } from './register_load_route';
import { registerDeleteRoute } from './register_delete_route';
import { registerSaveRoute } from './register_save_route';

export function registerLogstashPipelineRoutes(server) {
  registerLoadRoute(server);
  registerDeleteRoute(server);
  registerSaveRoute(server);
}
