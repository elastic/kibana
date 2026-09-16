/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuid_v4 } from 'uuid';
import type { ConversationEvent, EventActor } from '@kbn/agent-builder-common';
import type { ValidatedConversationEventAddInput } from './types';

export const materializeConversationEvents = ({
  events,
  actor,
  now,
}: {
  events: ValidatedConversationEventAddInput[];
  actor: EventActor;
  now: Date;
}): ConversationEvent[] => {
  const created_at = now.toISOString();
  return events.map((event) => ({
    ...event,
    id: uuid_v4(),
    actor,
    created_at,
  }));
};
