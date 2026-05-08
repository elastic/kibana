/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { InboxRouter } from '../types';
import { registerListInboxActionsRoute } from './actions/list_actions';

export interface RouteDependencies {
  router: InboxRouter;
  logger: Logger;
}

export const registerRoutes = (dependencies: RouteDependencies) => {
  registerListInboxActionsRoute(dependencies);
};
