/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { InboxRouter } from '../types';
import type { InboxActionRegistry } from '../services/inbox_action_registry';
import type { InboxSpaceIdResolver } from '../plugin';
import type { WatchWorkflowProjectionService } from '../services/watches/watch_workflow_projection_service';
import { registerListInboxActionsRoute } from './actions/list_actions';
import { registerListInboxActionsHistoryRoute } from './actions/list_history';
import { registerListInboxActionsHistoryFacetsRoute } from './actions/list_history_facets';
import { registerRespondToActionRoute } from './actions/respond_to_action';
import { registerListWatchesRoute } from './watches/list_watches';
import { registerGetWatchRoute } from './watches/get_watch';
import { registerCreateWatchRoute } from './watches/create_watch';
import { registerDeleteWatchRoute } from './watches/delete_watch';
import { registerListInvestigationsRoute } from './investigations/list_investigations';
import { registerGetInvestigationRoute } from './investigations/get_investigation';
import type { InvestigationProjectionService } from '../services/investigations/investigation_projection_service';

export interface RouteDependencies {
  router: InboxRouter;
  logger: Logger;
  registry: InboxActionRegistry;
  /**
   * Per-request resolver for the active space id. Routes MUST consult this
   * rather than defaulting to `'default'` — passing a bogus space id to
   * providers silently leaks cross-space data (or, for the respond route,
   * targets the wrong execution).
   */
  getSpaceId: InboxSpaceIdResolver;
  getWatchProjection?: () => WatchWorkflowProjectionService | undefined;
  getInvestigationProjection?: () => InvestigationProjectionService | undefined;
}

export const registerRoutes = (dependencies: RouteDependencies) => {
  registerListInboxActionsRoute(dependencies);
  registerListInboxActionsHistoryRoute(dependencies);
  registerListInboxActionsHistoryFacetsRoute(dependencies);
  registerRespondToActionRoute(dependencies);
  registerListWatchesRoute(dependencies);
  registerGetWatchRoute(dependencies);
  registerCreateWatchRoute(dependencies);
  registerDeleteWatchRoute(dependencies);
  registerListInvestigationsRoute(dependencies);
  registerGetInvestigationRoute(dependencies);
};
