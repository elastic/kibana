/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import {
  registerUpdateTagRoute,
  registerGetAllTagsRoute,
  registerGetTagRoute,
  registerDeleteTagRoute,
  registerCreateTagRoute,
} from './tags';
import { registerApiRoutes } from './api';
import {
  registerFindAssignableObjectsRoute,
  registerUpdateTagsAssignmentsRoute,
  registerGetAssignableTypesRoute,
} from './assignments';
import {
  registerInternalFindTagsRoute,
  registerInternalBulkDeleteRoute,
  registerInternalGetAllTagsRoute,
} from './internal';
import type { TagsPluginRouter } from '../types';

export const registerRoutes = ({
  router,
  usageCounter,
}: {
  router: TagsPluginRouter;
  usageCounter?: UsageCounter;
}) => {
  // public API
  registerApiRoutes(router, usageCounter);

  // deprecated tags API
  registerCreateTagRoute(router);
  registerUpdateTagRoute(router);
  registerDeleteTagRoute(router);
  registerGetAllTagsRoute(router);
  registerGetTagRoute(router);
  // assignment API
  registerFindAssignableObjectsRoute(router);
  registerUpdateTagsAssignmentsRoute(router);
  registerGetAssignableTypesRoute(router);
  // internal API
  registerInternalFindTagsRoute(router);
  registerInternalBulkDeleteRoute(router);
  registerInternalGetAllTagsRoute(router);
};
