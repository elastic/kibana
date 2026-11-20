/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../../../types';

import { registerListRoute } from './register_list_route';
import { registerReloadRoute } from './register_reload_route';
import { registerGetRoute } from './register_get_route';
import { registerPostIndexDocCountRoute } from './register_post_index_doc_count';
import { registerVectorCountRoute } from './register_vector_count_route';
import { registerDocumentsSampleRoute } from './register_documents_sample_route';

import { registerIndicesGet } from './indices_get';
import { registerUserStatusPrivilegeRoutes } from './register_user_status_route';

export function registerIndicesRoutes(dependencies: RouteDependencies) {
  registerListRoute(dependencies);
  registerReloadRoute(dependencies);
  registerGetRoute(dependencies);
  registerPostIndexDocCountRoute(dependencies);
  registerIndicesGet(dependencies);
  registerDocumentsSampleRoute(dependencies);
  registerUserStatusPrivilegeRoutes(dependencies);

  if (dependencies.config.isVectorCountEnabled) {
    registerVectorCountRoute(dependencies);
  }
}
