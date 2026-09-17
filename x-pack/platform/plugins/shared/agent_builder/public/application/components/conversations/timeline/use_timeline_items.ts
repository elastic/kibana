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
import { TimelineEventType, EventActorType } from '@kbn/agent-builder-common';
import type { ActiveExecutionDraft } from '../../../../services/events/active_execution_reducer';
import { useConversation } from '../../../hooks/use_conversation';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import {
  useStreamRecord,
  useConversationStreamService,
} from '../../../context/streaming/streaming_context';
import { buildSavedItems, buildLiveItems, assembleTimelineItems } from './to_timeline_items';
import type { TimelineItem } from './to_timeline_items';

const PENDING_USER_MESSAGE_ID = 'pending::user_message';

export const useTimelineItems = (): TimelineItem[] => {
  const conversationId = useConversationId();
  const { conversation } = useConversation();
  const conversationStreamService = useConversationStreamService();

  const activeStream$: Observable<ActiveExecutionDraft | null> = useMemo(
    () => (conversationId ? conversationStreamService.getActiveStream$(conversationId) : of(null)),
    [conversationStreamService, conversationId]
  );
  const activeExecution = useObservable(activeStream$, null);

  const { pendingMessage } = useStreamRecord(conversationId);
  const pendingUserMessage = useMemo<UserMessageEvent | null>(
    () =>
      pendingMessage
        ? {
            id: PENDING_USER_MESSAGE_ID,
            type: TimelineEventType.userMessage,
            created_at: new Date().toISOString(),
            actor: { type: EventActorType.user, id: '' },
            data: { message: pendingMessage },
          }
        : null,
    [pendingMessage]
  );

  const persistedEvents = conversation?.events;
  const localPromptResponse = activeExecution?.promptResponse;
  const savedItems = useMemo(
    () => buildSavedItems(persistedEvents ?? [], localPromptResponse ? [localPromptResponse] : []),
    [persistedEvents, localPromptResponse]
  );
  const liveItems = useMemo(
    () => buildLiveItems({ pendingUserMessage, activeExecution }),
    [pendingUserMessage, activeExecution]
  );
  return useMemo(() => assembleTimelineItems(savedItems, liveItems), [savedItems, liveItems]);
};
