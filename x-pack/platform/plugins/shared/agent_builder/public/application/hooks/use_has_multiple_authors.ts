/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  EventActorType,
  TimelineEventType,
  type ConversationEvent,
} from '@kbn/agent-builder-common';
import { useConversation } from './use_conversation';

const isMessageFromAPerson = ({ type, actor }: ConversationEvent): boolean =>
  type === TimelineEventType.userMessage &&
  (actor.type === EventActorType.user || actor.type === EventActorType.external);

/** True once more than one person has sent a message in the conversation. */
export const hasMultipleAuthors = (events: ConversationEvent[] = []): boolean => {
  const authorIds = new Set<string>();

  for (const event of events) {
    if (isMessageFromAPerson(event)) {
      authorIds.add(event.actor.id);

      if (authorIds.size > 1) {
        return true;
      }
    }
  }

  return false;
};

export const useHasMultipleAuthors = (): boolean => {
  const { conversation } = useConversation();
  const events = conversation?.events;

  return useMemo(() => hasMultipleAuthors(events), [events]);
};
