/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../../../types';

import { registerClearCacheRoute } from './register_clear_cache_route';
import { registerCloseRoute } from './register_close_route';
import { registerFlushRoute } from './register_flush_route';
import { registerForcemergeRoute } from './register_forcemerge_route';
import { registerListRoute } from './register_list_route';
import { registerOpenRoute } from './register_open_route';
import { registerRefreshRoute } from './register_refresh_route';
import { registerReloadRoute } from './register_reload_route';
import { registerDeleteRoute } from './register_delete_route';
import { registerGetRoute } from './register_get_route';
import { registerCreateRoute } from './register_create_route';
import { registerPostIndexDocCountRoute } from './register_post_index_doc_count';

import { registerIndicesGet } from './indices_get';
import { registerIndicesStats } from './indices_stats';

export function registerIndicesRoutes(dependencies: RouteDependencies) {
  registerClearCacheRoute(dependencies);
  registerCloseRoute(dependencies);
  registerFlushRoute(dependencies);
  registerForcemergeRoute(dependencies);
  registerListRoute(dependencies);
  registerOpenRoute(dependencies);
  registerRefreshRoute(dependencies);
  registerReloadRoute(dependencies);
  registerDeleteRoute(dependencies);
  registerGetRoute(dependencies);
  registerCreateRoute(dependencies);
  registerPostIndexDocCountRoute(dependencies);
  registerIndicesGet(dependencies);
  registerIndicesStats(dependencies);
}
