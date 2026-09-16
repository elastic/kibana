/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { IncidentsService } from './services/incidents_service';

/**
 * Dependencies injected into each incident route handler.
 *
 * Deliberately narrower than proposals' RouteDependencies:
 * - No `getSpaceId`: ConversationServiceImpl.getScopedClient already resolves the
 *   space via getCurrentSpaceId({ request, spaces }) (conversation_service.ts:68).
 * - No `resolveUser`: agent_builder derives the conversation owner directly from the
 *   Kibana request (conversation_service.ts:111-117). Re-resolving it here would
 *   create a second, independently-drifting notion of "who created this".
 */
export interface IncidentRouteDependencies {
  router: IRouter;
  logger: Logger;
  getIncidentsService: () => IncidentsService;
}
