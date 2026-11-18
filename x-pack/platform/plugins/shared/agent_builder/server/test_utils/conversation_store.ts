/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';
import { CONVERSATION_SCHEMA_VERSION, isEventsNativeVersion } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { roundsToEvents } from '../services/conversation/client/rounds_to_events';
import type { ConversationWithOperation } from '../services/execution/utils/conversations';
import { createConversationClientMock, type ConversationClientMock } from './conversations';

export interface ConversationStore {
  /** The conversation client over the stored document; `appendEvents` and `replaceRoundEvents` write. */
  client: ConversationClientMock;
  /** The stored conversation as the client reads it. */
  read: () => ConversationWithOperation;
}

/**
 * A stored conversation behind the conversation client: a legacy document reads with its events
 * derived from its rounds, and `appendEvents` / `replaceRoundEvents` apply as the client does.
 */
export const createConversationStore = (initial: Conversation): ConversationStore => {
  let stored = initial;
  const read = (): ConversationWithOperation => ({
    ...stored,
    events:
      isEventsNativeVersion(stored.schema_version) && stored.events?.length
        ? stored.events
        : roundsToEvents(stored),
    operation: 'UPDATE',
  });
  const write = (
    events: NonNullable<Conversation['events']>,
    attachments?: { produced: VersionedAttachment[] }
  ): Conversation => {
    stored = {
      ...stored,
      schema_version: CONVERSATION_SCHEMA_VERSION,
      events,
      ...(attachments ? { attachments: attachments.produced } : {}),
    };
    return stored;
  };
  const client = createConversationClientMock();
  client.appendEvents.mockImplementation(async ({ events, attachments }) => {
    const current = read().events ?? [];
    const ids = new Set(current.map(({ id }) => id));
    return write([...current, ...events.filter(({ id }) => !ids.has(id))], attachments);
  });
  client.replaceRoundEvents.mockImplementation(async ({ roundId, events, attachments }) => {
    const current = read().events ?? [];
    const isRoundEvent = ({ id }: { id: string }) => id.startsWith(`${roundId}::`);
    const others = current.filter((event) => !isRoundEvent(event));
    const otherIds = new Set(others.map(({ id }) => id));
    const firstRoundIndex = current.findIndex(isRoundEvent);
    const insertAt = firstRoundIndex === -1 ? others.length : firstRoundIndex;
    return write(
      [
        ...others.slice(0, insertAt),
        ...events.filter(({ id }) => !otherIds.has(id)),
        ...others.slice(insertAt),
      ],
      attachments
    );
  });
  return { client, read };
};
