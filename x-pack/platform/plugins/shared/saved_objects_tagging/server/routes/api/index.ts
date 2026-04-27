/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TagsPluginRouter } from '../../types';
import { registerCreateRoute } from './register_create_route';
import { registerDeleteRoute } from './register_delete_route';
import { registerListRoute } from './register_list_route';
import { registerReadRoute } from './register_read_route';
import { registerUpsertRoute } from './register_upsert_route';

export const registerApiRoutes = (router: TagsPluginRouter) => {
  registerListRoute(router);
  registerReadRoute(router);
  registerCreateRoute(router);
  registerUpsertRoute(router);
  registerDeleteRoute(router);
};
