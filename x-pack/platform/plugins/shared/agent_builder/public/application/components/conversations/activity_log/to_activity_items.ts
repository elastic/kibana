/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationActivityEventType,
  EventActorType,
  TimelineEventType,
  isActivityEvent,
  isAttachmentEvent,
  type ActivityEvent,
  type ConversationEvent,
  type ConversationParticipant,
  type EventActor,
} from '@kbn/agent-builder-common';

const HIDDEN_EVENT_TYPES: ReadonlySet<string> = new Set([
  ConversationActivityEventType.metadataUpdated,
  TimelineEventType.attachmentDeleted,
]);

export const resolveTimeZone = (configured?: string): string | undefined => {
  if (!configured || configured === 'Browser') {
    return undefined;
  }
  try {
    new Intl.DateTimeFormat('en', { timeZone: configured });
    return configured;
  } catch {
    return undefined;
  }
};

export const getTemplateDisplayName = (templateId: string, registeredName?: string): string => {
  if (registeredName) {
    return registeredName;
  }
  const words = templateId.replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export const isListedActivityEvent = (event: ConversationEvent): event is ActivityEvent =>
  isActivityEvent(event) &&
  !HIDDEN_EVENT_TYPES.has(event.type) &&
  !(isAttachmentEvent(event) && event.data.hidden);

export const toActivityItems = (events: ConversationEvent[] = []): ActivityEvent[] =>
  events
    .filter(isListedActivityEvent)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

export const findTriggeringUser = (
  event: ActivityEvent,
  events: ConversationEvent[] = []
): EventActor | undefined => {
  if (event.actor.type !== EventActorType.agent || !event.execution_id) {
    return undefined;
  }
  const triggerEventId = events.find(
    ({ execution_id: executionId, trigger_event_id: triggerId }) =>
      executionId === event.execution_id && triggerId !== undefined
  )?.trigger_event_id;
  const triggerActor = events.find(({ id }) => id === triggerEventId)?.actor;

  return triggerActor?.type === EventActorType.user ? triggerActor : undefined;
};

export const getEventParticipants = (event: ActivityEvent): ConversationParticipant[] =>
  event.type === ConversationActivityEventType.participantsAdded ||
  event.type === ConversationActivityEventType.participantsRemoved
    ? event.data.participants
    : [];
