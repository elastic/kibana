/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const pending = new Map<string, string[]>();
const pendingEvents = new Map<string, string>();

/**
 * Asks the Timeline tab to open filtered by these entities. The tab mounts when it is selected, so
 * the request waits here until it reads it.
 */
export const requestTimelineFocus = (
  conversationId: string,
  entityIds: string[],
  eventId?: string
): void => {
  pending.set(conversationId, entityIds);
  if (eventId) {
    pendingEvents.set(conversationId, eventId);
  } else {
    pendingEvents.delete(conversationId);
  }
};

/** The event the Timeline tab was asked to scroll to and mark, once. */
export const takeTimelineEventFocus = (conversationId: string): string | undefined => {
  const eventId = pendingEvents.get(conversationId);
  pendingEvents.delete(conversationId);
  return eventId;
};

/** The entities the Timeline tab was asked to focus on, once. */
export const takeTimelineFocus = (conversationId: string): string[] => {
  const entityIds = pending.get(conversationId) ?? [];
  pending.delete(conversationId);
  return entityIds;
};
