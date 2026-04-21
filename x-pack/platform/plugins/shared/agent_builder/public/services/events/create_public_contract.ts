/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type {
  EmbeddableConversationChange,
  EventsServiceStartContract,
} from '@kbn/agent-builder-browser/events';
import type { EventsService } from './events_service';

export const createPublicEventsContract = ({
  eventsService,
  sidebarOpen$,
  activeConversation$,
}: {
  eventsService: EventsService;
  sidebarOpen$: Observable<boolean>;
  activeConversation$: Observable<EmbeddableConversationChange | null>;
}): EventsServiceStartContract => {
  return {
    chat$: eventsService.obs$,
    ui: {
      sidebarOpen$,
      activeConversation$,
    },
  };
};
