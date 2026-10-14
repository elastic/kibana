/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { TagsPluginRouter } from '../../types';
import { registerCreateRoute } from './create/register_create_route';
import { registerDeleteRoute } from './delete/register_delete_route';
import { registerSearchRoute } from './search/register_search_route';
import { registerReadRoute } from './read/register_read_route';
import { registerUpsertRoute } from './upsert/register_upsert_route';

export const registerApiRoutes = (router: TagsPluginRouter, usageCounter?: UsageCounter) => {
  registerSearchRoute(router, usageCounter);
  registerReadRoute(router, usageCounter);
  registerCreateRoute(router, usageCounter);
  registerUpsertRoute(router, usageCounter);
  registerDeleteRoute(router, usageCounter);
};
