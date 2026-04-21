/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type {
  ActiveConversation,
  EventsServiceStartContract,
} from '@kbn/agent-builder-browser/events';
import type { EventsService } from './events_service';

export const createPublicEventsContract = ({
  eventsService,
  activeConversation$,
}: {
  eventsService: EventsService;
  activeConversation$: Observable<ActiveConversation | null>;
}): EventsServiceStartContract => {
  return {
    chat$: eventsService.obs$,
    ui: {
      activeConversation$,
    },
  };
};
