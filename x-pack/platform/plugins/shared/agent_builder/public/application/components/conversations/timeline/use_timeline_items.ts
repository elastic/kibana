/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { of } from 'rxjs';
import type { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { UserMessageEvent } from '@kbn/agent-builder-common';
import { TimelineEventType, EventActorType, TimelineTriggerType } from '@kbn/agent-builder-common';
import type { TimelineDisplayEvent } from '../../../../services/events';
import type { OptimisticAttachments } from '../../../utils/build_optimistic_attachments';
import { useConversation } from '../../../hooks/use_conversation';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import {
  useStreamRecord,
  useConversationStreamService,
} from '../../../context/streaming/streaming_context';
import { buildItems } from './to_timeline_items';
import { mergeEventsById } from './merge_events';
import type { TimelineItem } from './types';

const PENDING_USER_MESSAGE_ID = 'pending::user_message';
/** Key of the placeholder turn shown between hitting send and the run reporting that it started. */
const AWAITING_RUN_ITEM_KEY = 'active';
const EMPTY_EVENTS: TimelineDisplayEvent[] = [];

const startsARunTriggeredByAUserMessage = (event: TimelineDisplayEvent): boolean =>
  event.type === TimelineEventType.executionStarted &&
  event.data.trigger_type === TimelineTriggerType.userMessage;

/**
 * The id the server gave the message being sent, once the run started. Renaming the local copy to
 * it is what lets the saved twin replace it, instead of showing twice.
 */
const savedUserMessageId = (liveEvents: TimelineDisplayEvent[]): string | undefined =>
  liveEvents.filter(startsARunTriggeredByAUserMessage).at(-1)?.trigger_event_id;

const isSentMessageStillMissingItsRefs = (
  event: TimelineDisplayEvent,
  sentMessageId: string
): event is UserMessageEvent => {
  if (event.id !== sentMessageId || event.type !== TimelineEventType.userMessage) {
    return false;
  }
  return !event.data.attachment_refs?.length;
};

const withStagedAttachments = (
  event: UserMessageEvent,
  staged: OptimisticAttachments
): UserMessageEvent => ({
  ...event,
  data: {
    ...event.data,
    attachments: staged.fallbackAttachments,
    attachment_refs: staged.attachmentRefs,
  },
});

export const useTimelineItems = (): TimelineItem[] => {
  const conversationId = useConversationId();
  const { conversation } = useConversation();
  const conversationStreamService = useConversationStreamService();

  const activeStream$: Observable<TimelineDisplayEvent[]> = useMemo(
    () =>
      conversationId
        ? conversationStreamService.getActiveStream$(conversationId)
        : of(EMPTY_EVENTS),
    [conversationStreamService, conversationId]
  );
  const liveEvents = useObservable(activeStream$, EMPTY_EVENTS);

  const { pendingMessage, pendingAttachments } = useStreamRecord(conversationId);
  const startedUserMessageId = savedUserMessageId(liveEvents);
  const pendingUserMessageId = startedUserMessageId ?? PENDING_USER_MESSAGE_ID;
  const awaitingRunStart = !!pendingMessage && startedUserMessageId === undefined;
  const pendingUserMessage = useMemo<UserMessageEvent | null>(
    () =>
      pendingMessage
        ? {
            id: pendingUserMessageId,
            type: TimelineEventType.userMessage,
            created_at: new Date().toISOString(),
            actor: { type: EventActorType.user, id: '' },
            data: {
              message: pendingMessage,
              attachments: pendingAttachments?.fallbackAttachments,
              attachment_refs: pendingAttachments?.attachmentRefs,
            },
          }
        : null,
    [pendingMessage, pendingAttachments, pendingUserMessageId]
  );

  const docEvents = conversation?.events;
  // Once the saved twin is in the cache the message is no longer pending, even though the local
  // copy still exists.
  const isPendingUnsaved =
    !!pendingMessage && !docEvents?.some((event) => event.id === pendingUserMessageId);

  const events = useMemo(() => {
    // The pending message goes in before the live events: it is what started the run they describe.
    const merged = mergeEventsById(
      docEvents ?? [],
      pendingUserMessage ? [pendingUserMessage] : [],
      liveEvents
    );
    if (!pendingAttachments) {
      return merged;
    }
    return merged.map((event) =>
      isSentMessageStillMissingItsRefs(event, pendingUserMessageId)
        ? withStagedAttachments(event, pendingAttachments)
        : event
    );
  }, [docEvents, liveEvents, pendingUserMessage, pendingUserMessageId, pendingAttachments]);

  const items = useMemo(
    () => buildItems(events, isPendingUnsaved ? pendingUserMessageId : undefined),
    [events, isPendingUnsaved, pendingUserMessageId]
  );

  return useMemo(() => {
    if (!awaitingRunStart) {
      return items;
    }
    // The run has no id yet, so it has no events either. Show a spinner under the message until
    // `execution_started` arrives and the real turn takes this one's place.
    const awaitingTurn: TimelineItem = {
      kind: 'agentTurn',
      key: AWAITING_RUN_ITEM_KEY,
      status: 'running',
      startedAt: new Date().toISOString(),
      steps: [],
    };
    return [...items, awaitingTurn];
  }, [items, awaitingRunStart]);
};
