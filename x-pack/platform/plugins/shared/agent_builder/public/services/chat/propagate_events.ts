/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperatorFunction } from 'rxjs';
import { tap } from 'rxjs';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { EventsService } from '../events';

export function propagateEvents({
  eventsService,
}: {
  eventsService: EventsService;
}): OperatorFunction<ChatEvent, ChatEvent> {
  return tap((event) => {
    eventsService.propagateChatEvent(event);
  });
}
