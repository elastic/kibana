/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventsServiceStartContract } from '@kbn/agent-builder-browser/events';
import type { EventsService } from './events_service';

export const createPublicEventsContract = ({
  eventsService,
}: {
  eventsService: EventsService;
}): EventsServiceStartContract => {
  return {
    chat$: eventsService.obs$,
  };
};
