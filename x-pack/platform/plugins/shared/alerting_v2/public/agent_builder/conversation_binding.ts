/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActiveConversation } from '@kbn/agent-builder-browser/events';

export type ConversationBinding = { kind: 'unbound' } | { kind: 'bound'; id: string | undefined };

export const toConversationBinding = (
  conversation: ActiveConversation | null
): ConversationBinding =>
  conversation === null ? { kind: 'unbound' } : { kind: 'bound', id: conversation.id };

/*
 * Restage after the user switches chats (new draft or a different conversation).
 * Skip sidebar open/close and the draft→persisted id assignment for the same chat.
 */
export const shouldRestageOnConversationChange = (
  previous: ConversationBinding,
  next: ConversationBinding
): boolean => {
  if (next.kind === 'unbound' || previous.kind === 'unbound') {
    return false;
  }

  if (previous.id === next.id) {
    return false;
  }

  const isDraftPersisted = previous.id === undefined && next.id !== undefined;
  return !isDraftPersisted;
};
